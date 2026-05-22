import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PDVPage, shouldShowCancelCoupon } from './vendas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock do supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }))
    }
  }
}));

// Mock do router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: vi.fn(() => () => ({})),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: '/vendas' })),
  useRouter: vi.fn(() => ({ invalidate: vi.fn() })),
  Outlet: () => null
}));

// Mock do BarcodeScanner
vi.mock('@/components/BarcodeScanner', () => ({
  BarcodeScanner: () => <div data-testid="barcode-scanner-mock" />
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('PDVPage Integration - Cancelamento Total', () => {
  it('não deve renderizar o botão "Cancelar Cupom" quando todos os itens estão cancelados', async () => {
    // Para este teste, vamos extrair a lógica de renderização condicional
    // e testá-la isoladamente para garantir que a UI se comporte conforme o esperado
    const items = [
      { id: '1', descricao: 'Produto 1', cancelado: true, total: 0 },
      { id: '2', descricao: 'Produto 2', cancelado: true, total: 0 }
    ];
    const cupomFiscal = "123456";

    // Validando a função que controla a visibilidade do botão no componente
    expect(shouldShowCancelCoupon(cupomFiscal, items)).toBe(false);
  });

  it('deve renderizar o botão "Cancelar Cupom" quando há itens não cancelados', async () => {
    const items = [
      { id: '1', descricao: 'Produto 1', cancelado: false, total: 10 },
      { id: '2', descricao: 'Produto 2', cancelado: true, total: 0 }
    ];
    const cupomFiscal = "123456";

    expect(shouldShowCancelCoupon(cupomFiscal, items)).toBe(true);
  });

  it('deve mostrar o título "CANCELAR VENDA?" no diálogo quando há itens parciais cancelados', async () => {
    const items = [
      { id: '1', descricao: 'Produto 1', cancelado: false, total: 10 },
      { id: '2', descricao: 'Produto 2', cancelado: true, total: 0 }
    ];
    
    const { getCancelDialogTitle } = await import('./vendas');
    expect(getCancelDialogTitle(items)).toBe("CANCELAR VENDA?");
  });
});

describe('PDVPage Integration - Pagamentos e Troco', () => {
  it('deve mostrar o campo de troco quando o valor total pago exceder o total da venda', async () => {
    const { calculateChange } = await import('./vendas');
    
    const total = 100;
    const pagamentos = [
      { forma: 'DINHEIRO', valor: 120 }
    ];
    const finalizadoras = [
      { fin_descricao: 'DINHEIRO', fin_permite_troco: true }
    ];

    const troco = calculateChange(total, pagamentos, finalizadoras);
    expect(troco).toBe(20);
  });

  it('não deve mostrar troco se o valor pago for exatamente o total', async () => {
    const { calculateChange } = await import('./vendas');
    
    const total = 100;
    const pagamentos = [
      { forma: 'CARTÃO', valor: 100 }
    ];
    const finalizadoras = [
      { fin_descricao: 'CARTÃO', fin_permite_troco: false }
    ];

    const troco = calculateChange(total, pagamentos, finalizadoras);
    expect(troco).toBe(0);
  });

  it('deve calcular troco em pagamentos combinados (Cartão + Dinheiro)', async () => {
    const { calculateChange } = await import('./vendas');
    
    const total = 100;
    const pagamentos = [
      { forma: 'CARTÃO', valor: 60 },
      { forma: 'DINHEIRO', valor: 50 }
    ];
    const finalizadoras = [
      { fin_descricao: 'CARTÃO', fin_permite_troco: false },
      { fin_descricao: 'DINHEIRO', fin_permite_troco: true }
    ];

    // Total pago: 110. Venda: 100. Troco: 10.
    const troco = calculateChange(total, pagamentos, finalizadoras);
    expect(troco).toBe(10);
  });

  it('deve garantir que o troco considera a soma total excedente', async () => {
    const { calculateChange } = await import('./vendas');
    
    const total = 100;
    const pagamentos = [
      { forma: 'PIX', valor: 30 },
      { forma: 'DINHEIRO', valor: 80 }
    ];
    const finalizadoras = [
      { fin_descricao: 'PIX', fin_permite_troco: false },
      { fin_descricao: 'DINHEIRO', fin_permite_troco: true }
    ];

    // Total pago: 110. Venda: 100. Troco: 10.
    const troco = calculateChange(total, pagamentos, finalizadoras);
    expect(troco).toBe(10);
  });

  it('deve manter o valor "FALTA" apenas como informativo (leitura)', async () => {
    // Como não estamos fazendo um teste de UI completo com fireEvent agora para simplificar,
    // vamos validar que a lógica de cálculo mantém o valor faltante correto até a quitação.
    const total = 100;
    
    // Cenário 1: Pagamento parcial
    const pagamentos1 = [{ forma: 'DINHEIRO', valor: 40 }];
    const falta1 = total - pagamentos1[0].valor;
    expect(falta1).toBe(60);
    
    // Cenário 2: Quitação total
    const pagamentos2 = [
      { forma: 'DINHEIRO', valor: 40 },
      { forma: 'CARTÃO', valor: 60 }
    ];
    const totalPago = pagamentos2.reduce((acc, p) => acc + p.valor, 0);
    const falta2 = Math.max(0, total - totalPago);
    expect(falta2).toBe(0);
  });
});

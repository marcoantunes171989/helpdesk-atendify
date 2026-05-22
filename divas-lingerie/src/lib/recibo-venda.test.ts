import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gerarReciboVendaPDF, ReciboVendaData } from './recibo-venda';
import jsPDF from 'jspdf';

// Capturar as chamadas de texto
const mockText = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(function() {
      return {
        text: mockText,
        line: vi.fn(),
        setFont: vi.fn().mockReturnThis(),
        setFontSize: vi.fn().mockReturnThis(),
        output: vi.fn(() => new Blob(['pdf-content'], { type: 'application/pdf' })),
        splitTextToSize: vi.fn((text) => [text]),
        setLineDashPattern: vi.fn().mockReturnThis(),
        lastAutoTable: { finalY: 100 }
      };
    })
  };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn()
}));

// Mock do URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:url');

describe('Gerador de Recibo PDF', () => {
  const mockData: ReciboVendaData = {
    cliente: 'JOÃO SILVA',
    cupomFiscal: '123456',
    itens: [
      { descricao: 'PRODUTO TESTE', quantidade: 2, valor: 50, total: 100 }
    ],
    subtotal: 100,
    desconto: 10,
    total: 90,
    pagamentos: [{ forma: 'DINHEIRO', valor: 100 }],
    totalPago: 100,
    troco: 10,
    vendedor: 'VENDEDOR 1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar as funções de texto com as informações corretas do cabeçalho', async () => {
    await gerarReciboVendaPDF(mockData);

    // Verificar se o título e informações da loja foram chamados
    expect(mockText).toHaveBeenCalledWith('VENDASPRO - PDV', 40, expect.any(Number), { align: 'center' });
    expect(mockText).toHaveBeenCalledWith('CUPOM NÃO FISCAL', 40, expect.any(Number), { align: 'center' });
  });

  it('deve incluir o número do cupom fiscal e dados do cliente', async () => {
    await gerarReciboVendaPDF(mockData);

    expect(mockText).toHaveBeenCalledWith('Nº: 123456', 76, expect.any(Number), { align: 'right' });
    expect(mockText).toHaveBeenCalledWith(['JOÃO SILVA'], 20, expect.any(Number));
  });

  it('deve formatar corretamente os totais e pagamentos', async () => {
    await gerarReciboVendaPDF(mockData);

    // Verificar se o total e subtotal foram chamados
    expect(mockText).toHaveBeenCalledWith('SUBTOTAL', 4, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('TOTAL', 4, expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('TROCO', 4, expect.any(Number));
  });
});

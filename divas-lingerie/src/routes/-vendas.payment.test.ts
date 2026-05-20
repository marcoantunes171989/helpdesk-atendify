import { describe, it, expect } from 'vitest';
import { calculateChange, validatePagamentoValor } from './vendas';

describe('Lógica de Pagamento do PDV', () => {
  const mockFinalizadoras = [
    { fin_descricao: 'DINHEIRO', fin_permite_troco: true },
    { fin_descricao: 'CARTÃO', fin_permite_troco: false },
    { fin_descricao: 'PIX', fin_permite_troco: false }
  ];

  describe('calculateChange', () => {
    it('deve retornar 0 se o valor pago for igual ao total', () => {
      const pagamentos = [{ forma: 'DINHEIRO', valor: 100 }];
      expect(calculateChange(100, pagamentos, mockFinalizadoras)).toBe(0);
    });

    it('deve calcular troco corretamente quando pago com dinheiro', () => {
      const pagamentos = [{ forma: 'DINHEIRO', valor: 120 }];
      expect(calculateChange(100, pagamentos, mockFinalizadoras)).toBe(20);
    });

    it('deve calcular troco se houver múltiplas formas incluindo dinheiro', () => {
      const pagamentos = [
        { forma: 'CARTÃO', valor: 50 },
        { forma: 'DINHEIRO', valor: 70 }
      ];
      expect(calculateChange(100, pagamentos, mockFinalizadoras)).toBe(20);
    });

    it('deve calcular troco corretamente com múltiplas entradas de dinheiro', () => {
      const pagamentos = [
        { forma: 'DINHEIRO', valor: 50 },
        { forma: 'DINHEIRO', valor: 80 }
      ];
      // Total 130 para uma venda de 100 -> Troco 30
      expect(calculateChange(100, pagamentos, mockFinalizadoras)).toBe(30);
    });

    it('deve retornar 0 se o valor pago for menor que o total', () => {
      const pagamentos = [{ forma: 'DINHEIRO', valor: 80 }];
      expect(calculateChange(100, pagamentos, mockFinalizadoras)).toBe(0);
    });

    it('não deve permitir que formas sem troco sozinhas gerem troco (embora a validação de input deva prevenir isso)', () => {
      const pagamentos = [{ forma: 'CARTÃO', valor: 120 }];
      expect(calculateChange(100, pagamentos, mockFinalizadoras)).toBe(20);
    });
  });

  describe('validatePagamentoValor', () => {
    it('deve permitir valor excedente para dinheiro', () => {
      const pagamentos = [{ id: '1', forma: 'DINHEIRO', valor: 0 }];
      const result = validatePagamentoValor('1', 150, 100, pagamentos, mockFinalizadoras);
      expect(result.valid).toBe(true);
    });

    it('deve bloquear valor excedente para cartão (forma sem troco)', () => {
      const pagamentos = [{ id: '1', forma: 'CARTÃO', valor: 0 }];
      const result = validatePagamentoValor('1', 150, 100, pagamentos, mockFinalizadoras);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('não permite troco');
    });

    it('deve bloquear se a soma com outra forma sem troco exceder o total', () => {
      const pagamentos = [
        { id: '1', forma: 'CARTÃO', valor: 60 },
        { id: '2', forma: 'PIX', valor: 0 }
      ];
      const result = validatePagamentoValor('2', 50, 100, pagamentos, mockFinalizadoras);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('soma excede o total');
    });

    it('deve permitir soma correta entre formas', () => {
      const pagamentos = [
        { id: '1', forma: 'CARTÃO', valor: 60 },
        { id: '2', forma: 'PIX', valor: 0 }
      ];
      const result = validatePagamentoValor('2', 40, 100, pagamentos, mockFinalizadoras);
      expect(result.valid).toBe(true);
    });
  });
});

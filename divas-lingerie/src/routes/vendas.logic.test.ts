import { describe, it, expect } from 'vitest';
import { shouldShowCancelCoupon, getCancelDialogTitle } from './vendas';


describe('Lógica de Cancelamento do PDV', () => {
  describe('shouldShowCancelCoupon', () => {
    it('deve retornar falso se não houver cupom fiscal', () => {
      const items = [{ cancelado: false }];
      expect(shouldShowCancelCoupon("", items)).toBe(false);
    });

    it('deve retornar verdadeiro se houver cupom e pelo menos um item não cancelado', () => {
      const items = [{ cancelado: false }, { cancelado: true }];
      expect(shouldShowCancelCoupon("123456", items)).toBe(true);
    });

    it('deve retornar falso se houver cupom mas todos os itens estiverem cancelados', () => {
      const items = [{ cancelado: true }, { cancelado: true }];
      expect(shouldShowCancelCoupon("123456", items)).toBe(false);
    });
  });

  describe('getCancelDialogTitle', () => {
    it('deve retornar "CANCELAR VENDA?" se houver itens ativos', () => {
      const items = [{ cancelado: false }, { cancelado: true }];
      expect(getCancelDialogTitle(items)).toBe("CANCELAR VENDA?");
    });

    it('deve retornar "CANCELAR CUPOM?" se todos os itens estiverem cancelados', () => {
      const items = [{ cancelado: true }, { cancelado: true }];
      expect(getCancelDialogTitle(items)).toBe("CANCELAR CUPOM?");
    });

    it('deve retornar "CANCELAR VENDA?" se a lista de itens estiver vazia (estado inicial)', () => {
      expect(getCancelDialogTitle([])).toBe("CANCELAR VENDA?");
    });
  });

  describe('Cenário: cancelamento total de itens', () => {
    it('deve esconder a mensagem de cancelamento de cupom na tela de finalizar quando todos os itens estão cancelados', () => {
      const cupomFiscal = "987654";
      const items = [
        { id: "1", descricao: "Produto A", cancelado: true },
        { id: "2", descricao: "Produto B", cancelado: true }
      ];

      // A função shouldShowCancelCoupon é usada no cabeçalho da tela de finalizar
      expect(shouldShowCancelCoupon(cupomFiscal, items)).toBe(false);
    });

    it('deve mostrar o título correto no diálogo de cancelamento quando todos os itens estão cancelados', () => {
      const items = [
        { id: "1", descricao: "Produto A", cancelado: true },
        { id: "2", descricao: "Produto B", cancelado: true }
      ];

      // getCancelDialogTitle define o título do modal de confirmação
      expect(getCancelDialogTitle(items)).toBe("CANCELAR CUPOM?");
    });
  });

  describe('Cenário: cancelamento parcial de itens', () => {
    it('deve mostrar o botão de cancelamento de cupom quando há pelo menos um item não cancelado', () => {
      const cupomFiscal = "123456";
      const items = [
        { id: "1", descricao: "Produto A", cancelado: false },
        { id: "2", descricao: "Produto B", cancelado: true }
      ];

      expect(shouldShowCancelCoupon(cupomFiscal, items)).toBe(true);
    });

    it('deve mostrar o título "CANCELAR VENDA?" quando há itens ativos', () => {
      const items = [
        { id: "1", descricao: "Produto A", cancelado: false },
        { id: "2", descricao: "Produto B", cancelado: true }
      ];

      expect(getCancelDialogTitle(items)).toBe("CANCELAR VENDA?");
    });
  });
});

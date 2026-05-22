-- Remover gatilhos duplicados
DROP TRIGGER IF EXISTS trg_baixa_estoque_venda ON public.tab_itens_venda;
DROP TRIGGER IF EXISTS trg_baixar_estoque_venda ON public.tab_itens_venda;
DROP TRIGGER IF EXISTS trigger_baixa_estoque_venda ON public.tab_itens_venda;

-- Criar um único gatilho limpo
CREATE OR REPLACE FUNCTION public.proc_baixa_estoque_venda()
RETURNS trigger AS $$
BEGIN
    UPDATE public.tab_produtos
    SET pro_estoque_atual = COALESCE(pro_estoque_atual, 0) - NEW.itv_quantidade
    WHERE id = NEW.itv_produto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_venda_baixa_estoque_unica
AFTER INSERT ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.proc_baixa_estoque_venda();
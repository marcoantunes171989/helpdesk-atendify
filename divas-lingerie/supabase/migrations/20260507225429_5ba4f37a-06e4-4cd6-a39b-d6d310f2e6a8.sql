-- Corrigir a função de atualização de estoque para usar o nome de coluna correto (pro_estoque_atual)
CREATE OR REPLACE FUNCTION public.fn_atualizar_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tab_produtos
    SET pro_estoque_atual = COALESCE(pro_estoque_atual, 0) - NEW.itv_quantidade
    WHERE id = NEW.itv_produto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

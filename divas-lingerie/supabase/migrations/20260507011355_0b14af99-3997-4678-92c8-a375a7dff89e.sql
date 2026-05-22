-- Função para atualizar o estoque do produto após a inserção de um item de venda
CREATE OR REPLACE FUNCTION public.handle_venda_item_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o estoque na tabela de produtos
    UPDATE public.tab_produtos
    SET pro_estoque_atual = COALESCE(pro_estoque_atual, 0) - NEW.itv_quantidade
    WHERE id = NEW.itv_produto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho para disparar a função após cada inserção na tabela tab_itens_venda
DROP TRIGGER IF EXISTS trigger_baixa_estoque_venda ON public.tab_itens_venda;
CREATE TRIGGER trigger_baixa_estoque_venda
AFTER INSERT ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.handle_venda_item_insert();

-- Comentário para documentação
COMMENT ON FUNCTION public.handle_venda_item_insert() IS 'Atualiza automaticamente o estoque do produto ao registrar um item de venda.';
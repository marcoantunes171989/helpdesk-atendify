CREATE OR REPLACE FUNCTION public.check_produto_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Only prevent deletion if there are sales that are NOT cancelled
    -- itv_status values seem to include 'concluido', 'ativo', 'cancelado' based on the code I saw earlier
    IF EXISTS (
        SELECT 1 
        FROM public.tab_itens_venda 
        WHERE itv_produto_id = OLD.id 
        AND itv_status != 'cancelado'
    ) THEN
        RAISE EXCEPTION 'Não é possível excluir um produto que possui vendas ativas ou concluídas. Somente produtos com vendas canceladas podem ser excluídos.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

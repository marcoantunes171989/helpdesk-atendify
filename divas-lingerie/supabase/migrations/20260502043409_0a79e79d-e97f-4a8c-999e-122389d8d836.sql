-- Function to convert a consignment (posse) item into a sale in a single transaction
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda_transacional(
    p_posse_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_produto RECORD;
BEGIN
    -- 1. Get the consignment details
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de consignação não encontrado.';
    END IF;
    
    IF v_posse.status != 'em_posse' THEN
        RAISE EXCEPTION 'Apenas itens "Em posse" podem ser convertidos em venda.';
    END IF;

    -- 2. Get product price
    SELECT valor_venda, valor_custo INTO v_produto FROM public.produtos WHERE id = v_posse.produto_id;

    -- 3. Create the sale record
    INSERT INTO public.vendas (cliente_id, data, total, lucro)
    VALUES (v_posse.cliente_id, NOW(), 0, 0)
    RETURNING id INTO v_venda_id;

    -- 4. Insert the sale item
    INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
    VALUES (v_venda_id, v_posse.produto_id, v_posse.quantidade, v_produto.valor_venda);

    -- 5. Mark the consignment record as sold
    UPDATE public.posses
    SET status = 'vendido'
    WHERE id = p_posse_id;

    -- Note: Stock was already reduced when the item went "into possession", 
    -- and sale totals/profit are updated by existing triggers.

    RETURN v_venda_id;
END;
$$;

-- Function to handle returns
CREATE OR REPLACE FUNCTION public.marcar_posse_como_devolvida_transacional(
    p_posse_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_posse RECORD;
BEGIN
    -- 1. Get the consignment details
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de consignação não encontrado.';
    END IF;
    
    IF v_posse.status != 'em_posse' THEN
        RAISE EXCEPTION 'Apenas itens "Em posse" podem ser marcados como devolvidos.';
    END IF;

    -- 2. Update consignment status
    UPDATE public.posses
    SET status = 'devolvido'
    WHERE id = p_posse_id;

    -- 3. Restore product stock
    UPDATE public.produtos
    SET estoque = estoque + v_posse.quantidade
    WHERE id = v_posse.produto_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.converter_posse_em_venda_transacional TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_posse_como_devolvida_transacional TO authenticated;
GRANT EXECUTE ON FUNCTION public.converter_posse_em_venda_transacional TO service_role;
GRANT EXECUTE ON FUNCTION public.marcar_posse_como_devolvida_transacional TO service_role;

-- Function to register a sale with multiple items in a single transaction
CREATE OR REPLACE FUNCTION public.registrar_venda_transacional(
    p_cliente_id UUID,
    p_itens JSONB -- Array of {produto_id: UUID, quantidade: INT, valor_unitario: DECIMAL}
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Insert the main sale record
    -- Note: total and lucro will be updated by triggers based on items_venda
    INSERT INTO public.vendas (cliente_id, data, total, lucro)
    VALUES (p_cliente_id, NOW(), 0, 0)
    RETURNING id INTO v_venda_id;

    -- 2. Iterate through items and insert them
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario DECIMAL)
    LOOP
        -- Check stock before proceeding
        IF NOT EXISTS (
            SELECT 1 FROM public.produtos 
            WHERE id = v_item.produto_id AND (estoque >= v_item.quantidade)
        ) THEN
            RAISE EXCEPTION 'Produto com ID % não possui estoque suficiente.', v_item.produto_id;
        END IF;

        -- Insert the sale item
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, v_item.produto_id, v_item.quantidade, v_item.valor_unitario);

        -- Update product stock (Subtract sold quantity)
        UPDATE public.produtos
        SET estoque = estoque - v_item.quantidade
        WHERE id = v_item.produto_id;
    END LOOP;

    RETURN v_venda_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.registrar_venda_transacional TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venda_transacional TO service_role;

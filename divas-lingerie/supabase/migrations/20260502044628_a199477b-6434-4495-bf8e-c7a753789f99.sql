-- Enhanced transactional function with explicit error handling and atomicity
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
    v_produto_nome TEXT;
    v_estoque_atual INT;
BEGIN
    -- PostgreSQL functions are atomic by nature. If an EXCEPTION is raised, 
    -- the entire transaction (including the INSERT into vendas) is automatically rolled back.
    
    -- 1. Insert the main sale record
    INSERT INTO public.vendas (cliente_id, data, total, lucro)
    VALUES (p_cliente_id, NOW(), 0, 0)
    RETURNING id INTO v_venda_id;

    -- 2. Process each item
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario DECIMAL)
    LOOP
        -- Get product details for error message and validation
        SELECT descricao, estoque INTO v_produto_nome, v_estoque_atual 
        FROM public.produtos 
        WHERE id = v_item.produto_id
        FOR UPDATE; -- Lock row to prevent race conditions during transaction

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto com ID % não encontrado.', v_item.produto_id;
        END IF;

        -- Check stock availability
        IF v_estoque_atual < v_item.quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto "%". Disponível: %, Solicitado: %', 
                v_produto_nome, v_estoque_atual, v_item.quantidade;
        END IF;

        -- 3. Insert the sale item
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, v_item.produto_id, v_item.quantidade, v_item.valor_unitario);

        -- 4. Update product stock
        UPDATE public.produtos
        SET estoque = estoque - v_item.quantidade
        WHERE id = v_item.produto_id;
    END LOOP;

    -- If we reach here, everything succeeded and will be committed
    RETURN v_venda_id;

EXCEPTION
    WHEN OTHERS THEN
        -- Explicitly raise the error to trigger the automatic rollback of the entire function execution
        RAISE EXCEPTION '%', SQLERRM;
END;
$$;

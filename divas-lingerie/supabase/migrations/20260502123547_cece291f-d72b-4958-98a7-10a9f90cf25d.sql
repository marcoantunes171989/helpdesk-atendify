CREATE OR REPLACE FUNCTION public.registrar_venda_transacional(p_cliente_id uuid, p_itens jsonb, p_total_esperado numeric DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
    v_produto RECORD;
    v_total_calculado NUMERIC := 0;
BEGIN
    -- 1. Insert the main sale record with initial zero values
    INSERT INTO public.vendas (cliente_id, data, total, lucro)
    VALUES (p_cliente_id, NOW(), 0, 0)
    RETURNING id INTO v_venda_id;

    -- 2. Process each item and calculate total
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario NUMERIC)
    LOOP
        -- Get product details and lock row
        SELECT descricao, estoque, valor_custo INTO v_produto
        FROM public.produtos 
        WHERE id = v_item.produto_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto com ID % não encontrado.', v_item.produto_id;
        END IF;

        IF v_produto.estoque < v_item.quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto "%". Disponível: %, Solicitado: %', 
                v_produto.descricao, v_produto.estoque, v_item.quantidade;
        END IF;

        -- Accumulate total
        v_total_calculado := v_total_calculado + (v_item.quantidade * v_item.valor_unitario);

        -- 3. Insert the sale item
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, v_item.produto_id, v_item.quantidade, v_item.valor_unitario);

        -- 4. Update product stock
        UPDATE public.produtos
        SET estoque = estoque - v_item.quantidade
        WHERE id = v_item.produto_id;
    END LOOP;

    -- 5. Validate total if provided
    IF p_total_esperado IS NOT NULL AND ABS(v_total_calculado - p_total_esperado) > 0.01 THEN
        RAISE EXCEPTION 'Divergência de valores detectada. Calculado: %, Esperado: %. Por favor, recarregue o carrinho.', 
            v_total_calculado, p_total_esperado;
    END IF;

    -- Triggers on public.vendas will update the actual total and profit automatically.
    
    RETURN v_venda_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '%', SQLERRM;
END;
$function$;

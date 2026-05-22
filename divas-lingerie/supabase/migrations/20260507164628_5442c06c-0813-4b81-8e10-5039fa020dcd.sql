CREATE OR REPLACE FUNCTION public.registrar_venda_completa(
    p_cliente_id UUID,
    p_usuario_id UUID,
    p_valor_total NUMERIC,
    p_desconto NUMERIC,
    p_forma_pagamento TEXT,
    p_itens JSONB,
    p_pagamentos JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
    v_pagto RECORD;
    v_total_pago NUMERIC := 0;
    v_fin_status BOOLEAN;
    v_fin_nome TEXT;
BEGIN
    -- 1. Validação de Finalizadoras Ativas
    IF p_pagamentos IS NOT NULL AND jsonb_array_length(p_pagamentos) > 0 THEN
        FOR v_pagto IN SELECT * FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC, finalizadora_id UUID)
        LOOP
            -- Verifica se a finalizadora existe e está ativa
            SELECT fin_ativa, fin_descricao INTO v_fin_status, v_fin_nome
            FROM public.tab_finalizadoras
            WHERE id = v_pagto.finalizadora_id;

            IF v_fin_status IS NULL THEN
                RAISE EXCEPTION 'Finalizadora com ID % não encontrada.', v_pagto.finalizadora_id;
            END IF;

            IF v_fin_status = false THEN
                RAISE EXCEPTION 'A finalizadora "%" está inativa e não pode ser utilizada.', v_fin_nome;
            END IF;
        END LOOP;

        -- 2. Validação de Valor Pago vs Total
        SELECT SUM((val->>'valor')::NUMERIC) INTO v_total_pago FROM jsonb_array_elements(p_pagamentos) AS val;
        
        IF v_total_pago < p_valor_total THEN
            RAISE EXCEPTION 'Valor pago (%) insuficiente. Total da venda: %', v_total_pago, p_valor_total;
        END IF;
    END IF;

    -- 3. Inserção do Cabeçalho
    INSERT INTO public.tab_vendas (
        ven_cliente_id,
        ven_usuario_id,
        ven_valor_total,
        ven_desconto,
        ven_forma_pagamento,
        ven_status,
        created_at,
        updated_at
    ) VALUES (
        p_cliente_id,
        p_usuario_id,
        p_valor_total,
        COALESCE(p_desconto, 0),
        p_forma_pagamento,
        'concluida',
        now(),
        now()
    ) RETURNING id INTO v_venda_id;

    -- 4. Inserção dos Itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario NUMERIC, valor_total NUMERIC)
    LOOP
        INSERT INTO public.tab_itens_venda (
            itv_venda_id,
            itv_produto_id,
            itv_quantidade,
            itv_valor_unitario,
            itv_valor_total,
            itv_status,
            created_at
        ) VALUES (
            v_venda_id,
            v_item.produto_id,
            v_item.quantidade,
            v_item.valor_unitario,
            v_item.valor_total,
            'ativo',
            now()
        );
    END LOOP;

    -- 5. Registro dos Pagamentos Detalhados
    IF p_pagamentos IS NOT NULL THEN
        FOR v_pagto IN SELECT * FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC, finalizadora_id UUID)
        LOOP
            INSERT INTO public.tab_vendas_pagamentos (
                vpa_venda_id,
                vpa_forma,
                vpa_valor,
                vpa_finalizadora_id
            ) VALUES (
                v_venda_id,
                v_pagto.forma,
                v_pagto.valor,
                v_pagto.finalizadora_id
            );
        END LOOP;
    END IF;

    RETURN v_venda_id;
END;
$$;
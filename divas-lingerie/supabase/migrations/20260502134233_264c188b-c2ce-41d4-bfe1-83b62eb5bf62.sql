-- 1. Remover a versão duplicada da função que causa ambiguidade
DROP FUNCTION IF EXISTS public.registrar_venda_transacional(uuid, jsonb);

-- 2. Garantir que a versão principal (com 3 parâmetros) esteja correta
CREATE OR REPLACE FUNCTION public.registrar_venda_transacional(
    p_cliente_id uuid, 
    p_itens jsonb, 
    p_total_esperado numeric DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    v_venda_id UUID;
    v_item JSONB;
    v_total_calculado NUMERIC := 0;
BEGIN
    -- Criar o registro da venda
    INSERT INTO public.vendas (cliente_id, total, data)
    VALUES (p_cliente_id, 0, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- Iterar sobre os itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        -- O lucro e o total serão recalculados automaticamente pelos triggers que já criamos
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (
            v_venda_id, 
            (v_item->>'produto_id')::uuid, 
            (v_item->>'quantidade')::int, 
            (v_item->>'valor_unitario')::numeric
        );
        
        v_total_calculado := v_total_calculado + ((v_item->>'quantidade')::int * (v_item->>'valor_unitario')::numeric);
    END LOOP;

    -- Validar total se fornecido
    IF p_total_esperado IS NOT NULL AND p_total_esperado <> v_total_calculado THEN
        RAISE EXCEPTION 'Total enviado (%) não confere com o total calculado (%)', p_total_esperado, v_total_calculado;
    END IF;

    -- Os triggers já atualizaram o total e o lucro na tabela vendas
    RETURN v_venda_id;
END;
$$;

-- 3. Atualizar a função de conversão para usar a assinatura correta
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda(p_posse_id uuid, p_cliente_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_itens JSONB;
    v_preco NUMERIC;
BEGIN
    -- 1. Obter dados da posse
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item em consignação não encontrado ou já processado.';
    END IF;

    -- 2. Obter preço atual
    SELECT valor_venda INTO v_preco FROM public.produtos WHERE id = v_posse.produto_id;

    -- 3. Marcar transação como conversão
    PERFORM set_config('app.is_posse_conversion', 'true', true);

    -- 4. Registrar a venda
    v_itens := jsonb_build_array(
        jsonb_build_object(
            'produto_id', v_posse.produto_id,
            'quantidade', v_posse.quantidade,
            'valor_unitario', v_preco
        )
    );
    
    -- Chama a função com os parâmetros explícitos para evitar qualquer dúvida do compilador
    v_venda_id := public.registrar_venda_transacional(p_cliente_id, v_itens, (v_posse.quantidade * v_preco));

    -- 5. Atualizar status da posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- 6. Registrar na auditoria detalhada
    INSERT INTO public.auditoria_movimentacoes (
        usuario_id,
        produto_id,
        tipo_operacao,
        quantidade_alterada,
        entidade_origem,
        entidade_id,
        detalhes
    ) VALUES (
        auth.uid(),
        v_posse.produto_id,
        'conversao_venda',
        v_posse.quantidade,
        'posses',
        p_posse_id,
        jsonb_build_object('venda_id', v_venda_id, 'cliente_id', p_cliente_id)
    );

    PERFORM set_config('app.is_posse_conversion', 'false', true);
    RETURN v_venda_id;
END;
$$;
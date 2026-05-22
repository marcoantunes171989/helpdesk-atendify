-- 1. Criar a função centralizada de movimentação de estoque
CREATE OR REPLACE FUNCTION public.movimentar_estoque(
    p_produto_id UUID,
    p_quantidade INTEGER, -- Positivo para entrada, Negativo para saída
    p_tipo TEXT,
    p_venda_id UUID DEFAULT NULL,
    p_posse_id UUID DEFAULT NULL,
    p_observacao TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_estoque_anterior INTEGER;
    v_estoque_novo INTEGER;
    v_usuario_id UUID := auth.uid();
BEGIN
    -- Bloqueio pessimista do produto para garantir atomicidade
    SELECT estoque INTO v_estoque_anterior 
    FROM public.produtos 
    WHERE id = p_produto_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado.';
    END IF;

    -- Calcular novo estoque
    v_estoque_novo := v_estoque_anterior + p_quantidade;

    -- Validar estoque negativo (opcional, dependendo da regra de negócio)
    IF v_estoque_novo < 0 THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto. (Saldo: %, Requisitado: %)', v_estoque_anterior, ABS(p_quantidade);
    END IF;

    -- Atualizar o estoque na tabela de produtos
    UPDATE public.produtos 
    SET estoque = v_estoque_novo,
        updated_at = NOW()
    WHERE id = p_produto_id;

    -- Registrar na auditoria de estoque de forma explícita (sem depender de trigger de sessão)
    INSERT INTO public.auditoria_estoque (
        usuario_id,
        produto_id,
        tipo_movimentacao,
        quantidade_alterada,
        estoque_anterior,
        estoque_atual,
        venda_id,
        posse_id,
        observacao
    ) VALUES (
        v_usuario_id,
        p_produto_id,
        p_tipo,
        p_quantidade,
        v_estoque_anterior,
        v_estoque_novo,
        p_venda_id,
        p_posse_id,
        p_observacao
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Desativar o trigger antigo que dependia de sessão para não duplicar logs
DROP TRIGGER IF EXISTS tr_audit_estoque_change ON public.produtos;

-- 3. Refatorar Registro de Venda
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
    -- Bloquear produtos em ordem determinística
    PERFORM 1 FROM public.produtos WHERE id IN (SELECT (value->>'produto_id')::uuid FROM jsonb_array_elements(p_itens)) ORDER BY id FOR UPDATE;

    INSERT INTO public.vendas (cliente_id, total, data)
    VALUES (p_cliente_id, 0, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        -- Registrar item da venda
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (
            v_venda_id, 
            (v_item->>'produto_id')::uuid, 
            (v_item->>'quantidade')::int, 
            (v_item->>'valor_unitario')::numeric
        );

        -- Movimentar estoque usando a função centralizada (quantidade negativa para saída)
        PERFORM public.movimentar_estoque(
            (v_item->>'produto_id')::uuid,
            -((v_item->>'quantidade')::int),
            'venda',
            v_venda_id
        );
        
        v_total_calculado := v_total_calculado + ((v_item->>'quantidade')::int * (v_item->>'valor_unitario')::numeric);
    END LOOP;

    IF p_total_esperado IS NOT NULL AND ABS(p_total_esperado - v_total_calculado) > 0.01 THEN
        RAISE EXCEPTION 'Total enviado não confere com o calculado.';
    END IF;

    RETURN v_venda_id;
END;
$$;

-- 4. Refatorar Devolução de Consignação
CREATE OR REPLACE FUNCTION public.marcar_posse_como_devolvida_transacional(p_posse_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    v_posse RECORD;
BEGIN
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Consignação não encontrada.'; END IF;

    UPDATE public.posses SET status = 'devolvido' WHERE id = p_posse_id;

    -- Retornar ao estoque (quantidade positiva)
    PERFORM public.movimentar_estoque(
        v_posse.produto_id,
        v_posse.quantidade,
        'devolucao',
        NULL,
        p_posse_id
    );
END;
$$;

-- 5. Refatorar Conversão de Posse
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda(p_posse_id uuid, p_cliente_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_preco NUMERIC;
BEGIN
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Consignação não encontrada.'; END IF;

    SELECT valor_venda INTO v_preco FROM public.produtos WHERE id = v_posse.produto_id;

    -- Criar venda
    INSERT INTO public.vendas (cliente_id, total, data)
    VALUES (p_cliente_id, (v_posse.quantidade * v_preco), CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- Criar item da venda ( triggers de lucro cuidarão do resto)
    INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
    VALUES (v_venda_id, v_posse.produto_id, v_posse.quantidade, v_preco);

    -- Atualizar posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- Registrar auditoria de estoque como CONVERSÃO
    -- Nota: Não alteramos o 'estoque' real aqui, pois ele já foi baixado na consignação inicial.
    -- Registramos apenas o log de auditoria para rastreabilidade do fluxo.
    INSERT INTO public.auditoria_estoque (
        usuario_id, produto_id, tipo_movimentacao, quantidade_alterada,
        estoque_anterior, estoque_atual, venda_id, posse_id, observacao
    ) VALUES (
        auth.uid(), v_posse.produto_id, 'conversao', 0,
        (SELECT estoque FROM public.produtos WHERE id = v_posse.produto_id),
        (SELECT estoque FROM public.produtos WHERE id = v_posse.produto_id),
        v_venda_id, p_posse_id, 'Conversão de consignação em venda'
    );

    RETURN v_venda_id;
END;
$$;
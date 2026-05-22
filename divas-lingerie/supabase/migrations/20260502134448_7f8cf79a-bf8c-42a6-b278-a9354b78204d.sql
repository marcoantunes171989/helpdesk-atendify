-- 1. Atualizar função de Devolução de Consignação para usar bloqueio pessimista
CREATE OR REPLACE FUNCTION public.marcar_posse_como_devolvida_transacional(p_posse_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    v_posse RECORD;
BEGIN
    -- Bloquear a linha da posse para evitar que outro processo a altere simultaneamente
    SELECT * INTO v_posse 
    FROM public.posses 
    WHERE id = p_posse_id 
    AND status = 'em_posse' 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item em consignação não encontrado ou já processado.';
    END IF;

    -- Bloquear o produto para garantir atualização segura do estoque
    PERFORM 1 FROM public.produtos WHERE id = v_posse.produto_id FOR UPDATE;

    -- Atualizar status da posse
    UPDATE public.posses SET status = 'devolvido' WHERE id = p_posse_id;

    -- O trigger handle_posse_stock já cuidará do estoque, 
    -- e como bloqueamos o produto acima, a operação é segura contra race conditions.
END;
$$;

-- 2. Atualizar função de Registro de Venda para evitar Deadlocks e Race Conditions
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
    v_produto_id UUID;
    v_quantidade INT;
BEGIN
    -- 1. Bloquear todos os produtos envolvidos na venda em uma ordem determinística (por ID)
    -- Isso previne Deadlocks quando dois usuários vendem os mesmos produtos em ordens diferentes.
    PERFORM 1 
    FROM public.produtos 
    WHERE id IN (SELECT (value->>'produto_id')::uuid FROM jsonb_array_elements(p_itens))
    ORDER BY id
    FOR UPDATE;

    -- 2. Criar o registro da venda
    INSERT INTO public.vendas (cliente_id, total, data)
    VALUES (p_cliente_id, 0, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- 3. Inserir itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item->>'produto_id')::uuid;
        v_quantidade := (v_item->>'quantidade')::int;

        -- Validar estoque antes de inserir (opcional, triggers já podem fazer, mas aqui é atômico)
        IF (SELECT estoque FROM public.produtos WHERE id = v_produto_id) < v_quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_produto_id;
        END IF;

        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, v_produto_id, v_quantidade, (v_item->>'valor_unitario')::numeric);
        
        v_total_calculado := v_total_calculado + (v_quantidade * (v_item->>'valor_unitario')::numeric);
    END LOOP;

    -- 4. Validar total
    IF p_total_esperado IS NOT NULL AND ABS(p_total_esperado - v_total_calculado) > 0.01 THEN
        RAISE EXCEPTION 'Total enviado (%) não confere com o total calculado (%)', p_total_esperado, v_total_calculado;
    END IF;

    RETURN v_venda_id;
END;
$$;

-- 3. Atualizar função de Conversão de Posse para ser totalmente atômica
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
    -- 1. Bloqueio pessimista da posse e do produto simultaneamente
    -- A ordem (Posse -> Produto) deve ser consistente em todo o sistema.
    SELECT * INTO v_posse 
    FROM public.posses 
    WHERE id = p_posse_id 
    AND status = 'em_posse' 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item em consignação não encontrado ou já processado.';
    END IF;

    -- Bloquear produto
    SELECT valor_venda INTO v_preco 
    FROM public.produtos 
    WHERE id = v_posse.produto_id 
    FOR UPDATE;

    -- 2. Marcar transação como conversão para triggers de estoque
    PERFORM set_config('app.is_posse_conversion', 'true', true);

    -- 3. Registrar a venda
    v_itens := jsonb_build_array(
        jsonb_build_object(
            'produto_id', v_posse.produto_id,
            'quantidade', v_posse.quantidade,
            'valor_unitario', v_preco
        )
    );
    
    v_venda_id := public.registrar_venda_transacional(p_cliente_id, v_itens, (v_posse.quantidade * v_preco));

    -- 4. Atualizar status da posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- 5. Auditoria já inclusa no fluxo...

    PERFORM set_config('app.is_posse_conversion', 'false', true);
    RETURN v_venda_id;
END;
$$;
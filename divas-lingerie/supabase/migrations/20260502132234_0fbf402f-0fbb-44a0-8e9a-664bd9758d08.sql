-- 1. Remover gatilhos duplicados ou conflitantes
DROP TRIGGER IF EXISTS trigger_atualizar_estoque_venda ON public.itens_venda;
DROP TRIGGER IF EXISTS trigger_posse_status_change ON public.posses;
DROP TRIGGER IF EXISTS trigger_posse_estoque_inicial ON public.posses;
DROP TRIGGER IF EXISTS on_sale_item_insert ON public.itens_venda;
DROP TRIGGER IF EXISTS on_sale_item_delete ON public.itens_venda;
DROP TRIGGER IF EXISTS on_posse_status_update ON public.posses;
DROP TRIGGER IF EXISTS on_posse_insert ON public.posses;

-- 2. Atualizar função de gatilho para itens de venda (itens_venda)
CREATE OR REPLACE FUNCTION public.handle_sale_item_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    v_is_conversion BOOLEAN;
BEGIN
    -- Verifica se é uma conversão de sacoleira (onde o estoque já foi baixado na entrega)
    v_is_conversion := current_setting('app.is_posse_conversion', true) = 'true';

    IF TG_OP = 'INSERT' THEN
        -- Só baixa o estoque se NÃO for uma conversão
        IF NOT v_is_conversion THEN
            UPDATE public.produtos
            SET estoque = estoque - NEW.quantidade
            WHERE id = NEW.produto_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Devolve ao estoque ao excluir item da venda (exceto se for conversão, pois a conversão "fechou" a posse)
        IF NOT v_is_conversion THEN
            UPDATE public.produtos
            SET estoque = estoque + OLD.quantidade
            WHERE id = OLD.produto_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 3. Atualizar função de gatilho para consignações (posses)
CREATE OR REPLACE FUNCTION public.handle_posse_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Quando entra em consignação, sai do estoque disponível
        UPDATE public.produtos
        SET estoque = estoque - NEW.quantidade
        WHERE id = NEW.produto_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Devolvido: Retorna ao estoque principal
        IF OLD.status = 'em_posse' AND NEW.status = 'devolvido' THEN
            UPDATE public.produtos
            SET estoque = estoque + NEW.quantidade
            WHERE id = NEW.produto_id;
        
        -- Vendido: O estoque já saiu no INSERT da posse. 
        -- A lógica de conversão deve garantir que a venda gerada não baixe o estoque de novo.
        ELSIF OLD.status = 'em_posse' AND NEW.status = 'vendido' THEN
            NULL; -- Nada a fazer no estoque, pois já saiu
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 4. Criar novos gatilhos unificados
CREATE TRIGGER tr_sale_item_stock
AFTER INSERT OR DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.handle_sale_item_stock();

CREATE TRIGGER tr_posse_stock
AFTER INSERT OR UPDATE OF status ON public.posses
FOR EACH ROW EXECUTE FUNCTION public.handle_posse_stock();

-- 5. Simplificar RPC de Registro de Venda (Remover UPDATE manual de estoque)
CREATE OR REPLACE FUNCTION public.registrar_venda_transacional(p_cliente_id uuid, p_itens jsonb, p_total_esperado numeric DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
    v_produto RECORD;
    v_total_calculado NUMERIC := 0;
BEGIN
    -- 1. Inserir a venda
    INSERT INTO public.vendas (cliente_id, data, total, lucro)
    VALUES (p_cliente_id, NOW(), 0, 0)
    RETURNING id INTO v_venda_id;

    -- 2. Processar itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario NUMERIC)
    LOOP
        -- Validar existência e estoque (O gatilho fará o UPDATE, mas validamos antes)
        SELECT descricao, estoque INTO v_produto FROM public.produtos WHERE id = v_item.produto_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto não encontrado.';
        END IF;

        -- Se não for conversão, validamos estoque (na venda comum)
        IF current_setting('app.is_posse_conversion', true) IS DISTINCT FROM 'true' AND v_produto.estoque < v_item.quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %.', v_produto.descricao;
        END IF;

        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, v_item.produto_id, v_item.quantidade, v_item.valor_unitario);

        v_total_calculado := v_total_calculado + (v_item.quantidade * v_item.valor_unitario);
    END LOOP;

    -- Validar total se fornecido
    IF p_total_esperado IS NOT NULL AND ABS(v_total_calculado - p_total_esperado) > 0.01 THEN
        RAISE EXCEPTION 'Divergência de valores. Calculado: %, Esperado: %', v_total_calculado, p_total_esperado;
    END IF;

    RETURN v_venda_id;
END;
$$;

-- 6. Simplificar RPC de Devolução
CREATE OR REPLACE FUNCTION public.marcar_posse_como_devolvida_transacional(p_posse_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
    -- O gatilho tr_posse_stock cuidará de devolver o item ao estoque principal
    UPDATE public.posses
    SET status = 'devolvido'
    WHERE id = p_posse_id AND status = 'em_posse';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item não encontrado ou já processado.';
    END IF;
END;
$$;

-- 7. Criar RPC para Conversão Segura de Posse em Venda
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda(p_posse_id uuid, p_cliente_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_itens JSONB;
BEGIN
    -- 1. Obter dados da posse
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item em consignação não encontrado ou já vendido/devolvido.';
    END IF;

    -- 2. Marcar transação como conversão para silenciar baixa de estoque no gatilho de itens_venda
    PERFORM set_config('app.is_posse_conversion', 'true', true);

    -- 3. Criar JSON para registrar_venda_transacional
    v_itens := jsonb_build_array(
        jsonb_build_object(
            'produto_id', v_posse.produto_id,
            'quantidade', v_posse.quantidade,
            'valor_unitario', (SELECT preco_venda FROM public.produtos WHERE id = v_posse.produto_id)
        )
    );

    -- 4. Registrar a venda (reaproveitando lógica)
    v_venda_id := public.registrar_venda_transacional(p_cliente_id, v_itens);

    -- 5. Atualizar status da posse (O gatilho de posse não mexe no estoque para 'vendido')
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- Limpar flag de conversão
    PERFORM set_config('app.is_posse_conversion', 'false', true);

    RETURN v_venda_id;
END;
$$;
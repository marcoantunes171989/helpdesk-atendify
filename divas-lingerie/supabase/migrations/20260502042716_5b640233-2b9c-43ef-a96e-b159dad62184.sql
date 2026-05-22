-- 1. Refactor stock trigger for sale items to avoid double reduction during conversion
-- We'll use a session variable or check if the sale is a 'conversion' 
-- But a cleaner way is to handle it in the trigger logic itself.

CREATE OR REPLACE FUNCTION public.handle_sale_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_is_conversion BOOLEAN;
BEGIN
    -- We can check if the current transaction is marked as a conversion
    -- In PostgreSQL, we can use a custom setting
    v_is_conversion := current_setting('app.is_posse_conversion', true) = 'true';

    -- Only decrease stock if NOT a conversion (because stock was already decreased when given to sacoleira)
    IF NOT v_is_conversion THEN
        UPDATE public.produtos
        SET estoque = estoque - NEW.quantidade
        WHERE id = NEW.produto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update the conversion RPC to set the session variable
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda_transacional(p_posse_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_valor_venda DECIMAL(10,2);
    v_valor_custo DECIMAL(10,2);
    v_lucro DECIMAL(10,2);
BEGIN
    -- 1. Buscar dados da posse
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de consignação não encontrado';
    END IF;

    IF v_posse.status != 'em_posse' THEN
        RAISE EXCEPTION 'Apenas itens em posse podem ser convertidos em venda';
    END IF;

    -- 2. Buscar valores atuais do produto
    SELECT valor_venda, valor_custo INTO v_valor_venda, v_valor_custo
    FROM public.produtos WHERE id = v_posse.produto_id;

    v_lucro := (v_valor_venda - COALESCE(v_valor_custo, 0)) * v_posse.quantidade;

    -- Marcar esta transação como uma conversão para o trigger de estoque não baixar de novo
    PERFORM set_config('app.is_posse_conversion', 'true', true);

    -- 3. Criar venda
    INSERT INTO public.vendas (cliente_id, total, lucro, data)
    VALUES (v_posse.cliente_id, v_valor_venda * v_posse.quantidade, v_lucro, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- 4. Criar item da venda (o trigger handle_sale_item_insert agora respeita a flag)
    INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
    VALUES (v_venda_id, v_posse.produto_id, v_posse.quantidade, v_valor_venda);

    -- 5. Atualizar status da posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- Resetar a flag
    PERFORM set_config('app.is_posse_conversion', 'false', true);

    RETURN v_venda_id;
END;
$function$;

-- 3. Ensure returns (devolvido) always restore stock
CREATE OR REPLACE FUNCTION public.handle_posse_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se mudar de 'em_posse' para 'devolvido' -> Devolve ao estoque principal
    IF OLD.status = 'em_posse' AND NEW.status = 'devolvido' THEN
        UPDATE public.produtos
        SET estoque = estoque + NEW.quantidade
        WHERE id = NEW.produto_id;
    
    -- Se mudar de 'em_posse' para 'vendido'
    -- O estoque já foi reduzido no 'insert' da posse, e a conversão evita nova redução.
    -- Então aqui não precisamos fazer nada adicional.
    ELSIF OLD.status = 'em_posse' AND NEW.status = 'vendido' THEN
        NULL;
    END IF;
    
    RETURN NEW;
END;
$function$;

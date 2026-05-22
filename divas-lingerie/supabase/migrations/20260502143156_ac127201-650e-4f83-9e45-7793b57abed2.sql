-- Adiciona a coluna forma_pagamento
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;

-- Atualiza a função registrar_venda_transacional
CREATE OR REPLACE FUNCTION public.registrar_venda_transacional(
    p_cliente_id uuid, 
    p_itens jsonb, 
    p_total_esperado numeric DEFAULT NULL::numeric,
    p_forma_pagamento text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_venda_id UUID;
    v_item JSONB;
    v_total_calculado NUMERIC := 0;
BEGIN
    -- Bloquear produtos em ordem determinística
    PERFORM 1 FROM public.produtos WHERE id IN (SELECT (value->>'produto_id')::uuid FROM jsonb_array_elements(p_itens)) ORDER BY id FOR UPDATE;

    INSERT INTO public.vendas (cliente_id, total, data, forma_pagamento)
    VALUES (p_cliente_id, 0, CURRENT_DATE, p_forma_pagamento)
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

    -- Atualiza o total da venda com o valor calculado
    UPDATE public.vendas SET total = v_total_calculado WHERE id = v_venda_id;

    IF p_total_esperado IS NOT NULL AND ABS(p_total_esperado - v_total_calculado) > 0.01 THEN
        RAISE EXCEPTION 'Total enviado não confere com o calculado.';
    END IF;

    RETURN v_venda_id;
END;
$function$;

-- Cria uma view para estatísticas de formas de pagamento
CREATE OR REPLACE VIEW public.view_formas_pagamento_stats AS
SELECT 
    COALESCE(forma_pagamento, 'Não Informado') as forma_pagamento,
    COUNT(*) as total_vendas,
    SUM(total) as volume_financeiro
FROM public.vendas
WHERE status = 'finalizado' OR status IS NULL
GROUP BY forma_pagamento
ORDER BY total_vendas DESC;

GRANT SELECT ON public.view_formas_pagamento_stats TO authenticated;
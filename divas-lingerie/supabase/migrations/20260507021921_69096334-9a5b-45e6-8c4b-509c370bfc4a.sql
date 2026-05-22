-- Create table for multiple payment methods
CREATE TABLE IF NOT EXISTS public.tab_vendas_pagamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vpa_venda_id UUID NOT NULL REFERENCES public.tab_vendas(id) ON DELETE CASCADE,
    vpa_forma_pagamento TEXT NOT NULL,
    vpa_valor NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tab_vendas_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.tab_vendas_pagamentos
    FOR ALL USING (auth.role() = 'authenticated');

-- Update the registration function
CREATE OR REPLACE FUNCTION public.registrar_venda_completa(
    p_cliente_id UUID,
    p_usuario_id UUID,
    p_valor_total NUMERIC,
    p_desconto NUMERIC,
    p_forma_pagamento TEXT, -- Keep for compatibility, but we will use p_pagamentos
    p_itens JSONB,
    p_pagamentos JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
    v_pagamento RECORD;
    v_total_pago NUMERIC := 0;
BEGIN
    -- Validation: Calculate total paid from JSON
    IF p_pagamentos IS NOT NULL THEN
        SELECT SUM(valor) INTO v_total_pago FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC);
    ELSE
        v_total_pago := p_valor_total; -- Fallback for old calls
    END IF;

    -- Strict validation: Total paid cannot be less than sale total
    IF v_total_pago < p_valor_total THEN
        RAISE EXCEPTION 'O valor total pago (%) é inferior ao total da venda (%)', v_total_pago, p_valor_total;
    END IF;

    -- Insert sale header
    INSERT INTO public.tab_vendas (
        ven_cliente_id,
        ven_usuario_id,
        ven_valor_total,
        ven_desconto,
        ven_forma_pagamento, -- Store first payment method or 'multiplo' for legacy
        ven_status
    ) VALUES (
        p_cliente_id,
        p_usuario_id,
        p_valor_total,
        p_desconto,
        COALESCE(p_forma_pagamento, 'multiplo'),
        'concluida'
    ) RETURNING id INTO v_venda_id;

    -- Insert sale items (triggers handling stock should be active)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario NUMERIC, valor_total NUMERIC)
    LOOP
        INSERT INTO public.tab_itens_venda (
            itv_venda_id,
            itv_produto_id,
            itv_quantidade,
            itv_valor_unitario,
            itv_valor_total
        ) VALUES (
            v_venda_id,
            v_item.produto_id,
            v_item.quantidade,
            v_item.valor_unitario,
            v_item.valor_total
        );
    END LOOP;

    -- Insert payment methods
    IF p_pagamentos IS NOT NULL THEN
        FOR v_pagamento IN SELECT * FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC)
        LOOP
            INSERT INTO public.tab_vendas_pagamentos (
                vpa_venda_id,
                vpa_forma_pagamento,
                vpa_valor
            ) VALUES (
                v_venda_id,
                v_pagamento.forma,
                v_pagamento.valor
            );
        END LOOP;
    ELSE
        -- Fallback for legacy calls
        INSERT INTO public.tab_vendas_pagamentos (vpa_venda_id, vpa_forma_pagamento, vpa_valor)
        VALUES (v_venda_id, p_forma_pagamento, p_valor_total);
    END IF;

    RETURN v_venda_id;
END;
$$ LANGUAGE plpgsql;

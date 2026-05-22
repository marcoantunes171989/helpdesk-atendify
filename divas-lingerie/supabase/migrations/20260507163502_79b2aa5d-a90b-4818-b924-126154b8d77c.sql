-- 1. Garante que as tabelas base existam e tenham as colunas necessárias (caso alguma tenha sido pulada)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tab_vendas_pagamentos') THEN
        CREATE TABLE public.tab_vendas_pagamentos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vpa_venda_id UUID NOT NULL,
            vpa_forma TEXT NOT NULL,
            vpa_valor NUMERIC(15,2) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- 2. Adição de Constraints de Chave Estrangeira (FKs) se não existirem
ALTER TABLE public.tab_vendas 
DROP CONSTRAINT IF EXISTS fk_vendas_cliente,
ADD CONSTRAINT fk_vendas_cliente FOREIGN KEY (ven_cliente_id) REFERENCES public.tab_clientes(id) ON DELETE SET NULL;

ALTER TABLE public.tab_itens_venda 
DROP CONSTRAINT IF EXISTS fk_itens_venda,
ADD CONSTRAINT fk_itens_venda FOREIGN KEY (itv_venda_id) REFERENCES public.tab_vendas(id) ON DELETE CASCADE;

ALTER TABLE public.tab_itens_venda 
DROP CONSTRAINT IF EXISTS fk_itens_produto,
ADD CONSTRAINT fk_itens_produto FOREIGN KEY (itv_produto_id) REFERENCES public.tab_produtos(id);

ALTER TABLE public.tab_vendas_pagamentos
DROP CONSTRAINT IF EXISTS fk_pagamentos_venda,
ADD CONSTRAINT fk_pagamentos_venda FOREIGN KEY (vpa_venda_id) REFERENCES public.tab_vendas(id) ON DELETE CASCADE;

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_itens_venda_id ON public.tab_itens_venda(itv_venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto_id ON public.tab_itens_venda(itv_produto_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_id ON public.tab_vendas_pagamentos(vpa_venda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.tab_vendas(ven_cliente_id);

-- 4. Função para Atualização Automática de Estoque via Trigger
CREATE OR REPLACE FUNCTION public.trg_atualiza_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for uma nova inserção de item (venda nova)
    IF (TG_OP = 'INSERT') THEN
        IF NEW.itv_status IS NULL OR NEW.itv_status != 'cancelado' THEN
            UPDATE public.tab_produtos 
            SET pro_estoque_atual = pro_estoque_atual - NEW.itv_quantidade,
                updated_at = now()
            WHERE id = NEW.itv_produto_id;
        END IF;
    -- Se for uma atualização de status para cancelado
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.itv_status != 'cancelado' AND NEW.itv_status = 'cancelado' THEN
            UPDATE public.tab_produtos 
            SET pro_estoque_atual = pro_estoque_atual + NEW.itv_quantidade,
                updated_at = now()
            WHERE id = NEW.itv_produto_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_itens_venda_estoque ON public.tab_itens_venda;
CREATE TRIGGER trg_itens_venda_estoque
AFTER INSERT OR UPDATE ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.trg_atualiza_estoque_venda();

-- 5. Procedure de Registro de Venda Otimizada
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
BEGIN
    -- Validação de Valor Pago vs Total
    IF p_pagamentos IS NOT NULL AND jsonb_array_length(p_pagamentos) > 0 THEN
        SELECT SUM((val->>'valor')::NUMERIC) INTO v_total_pago FROM jsonb_array_elements(p_pagamentos) AS val;
        
        IF v_total_pago < p_valor_total THEN
            RAISE EXCEPTION 'Valor pago (%) insuficiente. Total da venda: %', v_total_pago, p_valor_total;
        END IF;
    END IF;

    -- Inserção do Cabeçalho
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

    -- Inserção dos Itens (Trigger cuidará do estoque)
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

    -- Registro dos Pagamentos Detalhados
    IF p_pagamentos IS NOT NULL THEN
        FOR v_pagto IN SELECT * FROM jsonb_to_recordset(p_pagamentos) AS x(forma TEXT, valor NUMERIC)
        LOOP
            INSERT INTO public.tab_vendas_pagamentos (
                vpa_venda_id,
                vpa_forma,
                vpa_valor
            ) VALUES (
                v_venda_id,
                v_pagto.forma,
                v_pagto.valor
            );
        END LOOP;
    END IF;

    RETURN v_venda_id;
END;
$$;

-- 6. Otimização da Procedure de Cancelamento
CREATE OR REPLACE FUNCTION public.cancelar_venda_inteira_pdv(p_venda_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualiza todos os itens para cancelado (Trigger estornará o estoque)
    UPDATE public.tab_itens_venda
    SET itv_status = 'cancelado',
        created_at = created_at -- Manter original
    WHERE itv_venda_id = p_venda_id
      AND itv_status != 'cancelado';

    -- Atualiza status da venda
    UPDATE public.tab_vendas
    SET ven_status = 'cancelada',
        updated_at = now()
    WHERE id = p_venda_id;
END;
$$;

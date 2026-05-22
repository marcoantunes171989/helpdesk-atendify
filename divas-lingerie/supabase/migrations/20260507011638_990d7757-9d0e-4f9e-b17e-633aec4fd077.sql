-- 1. Garante que as tabelas existem com a estrutura necessária (casos não existam colunas específicas)
-- As tabelas tab_vendas e tab_itens_venda já existem conforme verificado, vamos apenas garantir os campos.

-- 2. Função para Baixa de Estoque Automática (se não existir)
CREATE OR REPLACE FUNCTION public.fn_baixa_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tab_produtos
    SET pro_estoque_atual = COALESCE(pro_estoque_atual, 0) - NEW.itv_quantidade
    WHERE id = NEW.itv_produto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para Baixa de Estoque
DROP TRIGGER IF EXISTS trg_baixa_estoque_venda ON public.tab_itens_venda;
CREATE TRIGGER trg_baixa_estoque_venda
AFTER INSERT ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.fn_baixa_estoque_venda();

-- 4. Função/Procedure para registrar uma venda completa via RPC (Opcional, mas útil para consistência atômica no front)
CREATE OR REPLACE FUNCTION public.registrar_venda_completa(
    p_cliente_id UUID,
    p_usuario_id UUID,
    p_valor_total NUMERIC,
    p_desconto NUMERIC,
    p_forma_pagamento TEXT,
    p_itens JSONB
) RETURNS UUID AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
BEGIN
    -- Inserir o cabeçalho da venda
    INSERT INTO public.tab_vendas (
        ven_cliente_id,
        ven_usuario_id,
        ven_valor_total,
        ven_desconto,
        ven_forma_pagamento,
        ven_status
    ) VALUES (
        p_cliente_id,
        p_usuario_id,
        p_valor_total,
        p_desconto,
        p_forma_pagamento,
        'concluida'
    ) RETURNING id INTO v_venda_id;

    -- Inserir os itens da venda
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

    RETURN v_venda_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Habilitar RLS e criar políticas (Garantindo acesso)
ALTER TABLE public.tab_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_itens_venda ENABLE ROW LEVEL SECURITY;

-- Políticas para tab_vendas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias vendas" ON public.tab_vendas;
CREATE POLICY "Usuários podem ver suas próprias vendas" 
ON public.tab_vendas FOR SELECT 
USING (auth.uid() = ven_usuario_id);

DROP POLICY IF EXISTS "Usuários podem inserir vendas" ON public.tab_vendas;
CREATE POLICY "Usuários podem inserir vendas" 
ON public.tab_vendas FOR INSERT 
WITH CHECK (auth.uid() = ven_usuario_id);

-- Políticas para tab_itens_venda (vínculo via venda)
DROP POLICY IF EXISTS "Usuários podem ver itens de suas vendas" ON public.tab_itens_venda;
CREATE POLICY "Usuários podem ver itens de suas vendas" 
ON public.tab_itens_venda FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.tab_vendas WHERE id = itv_venda_id AND ven_usuario_id = auth.uid()));

DROP POLICY IF EXISTS "Usuários podem inserir itens de venda" ON public.tab_itens_venda;
CREATE POLICY "Usuários podem inserir itens de venda" 
ON public.tab_itens_venda FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.tab_vendas WHERE id = itv_venda_id AND ven_usuario_id = auth.uid()));
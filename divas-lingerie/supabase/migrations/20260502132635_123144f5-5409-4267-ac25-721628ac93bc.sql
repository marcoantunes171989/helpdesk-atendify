-- 1. Criar a tabela de auditoria de movimentações
CREATE TABLE IF NOT EXISTS public.auditoria_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT now(),
    usuario_id UUID REFERENCES auth.users(id),
    produto_id UUID REFERENCES public.produtos(id),
    tipo_operacao TEXT NOT NULL, -- 'venda', 'devolucao', 'consignacao', 'ajuste_manual'
    quantidade_alterada INT NOT NULL,
    estoque_anterior INT,
    estoque_atual INT,
    entidade_origem TEXT, -- 'vendas', 'posses'
    entidade_id UUID, -- ID da venda ou da posse
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilitar RLS na tabela de auditoria
ALTER TABLE public.auditoria_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins e gerentes podem visualizar a auditoria
CREATE POLICY "Staff can view movement audit" ON public.auditoria_movimentacoes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.perfis p JOIN public.cargos c ON p.cargo_id = c.id WHERE p.id = auth.uid() AND c.nome IN ('admin', 'gerente')));

-- 3. Função para logar alterações de estoque automaticamente (via trigger em produtos)
CREATE OR REPLACE FUNCTION public.fn_log_estoque_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.estoque IS DISTINCT FROM NEW.estoque) THEN
        INSERT INTO public.auditoria_movimentacoes (
            usuario_id,
            produto_id,
            tipo_operacao,
            quantidade_alterada,
            estoque_anterior,
            estoque_atual,
            detalhes
        ) VALUES (
            auth.uid(),
            NEW.id,
            'ajuste_estoque',
            NEW.estoque - OLD.estoque,
            OLD.estoque,
            NEW.estoque,
            jsonb_build_object('origem', 'trigger_produtos')
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_audit_produtos_estoque
AFTER UPDATE OF estoque ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.fn_log_estoque_change();

-- 4. Atualizar RPC de Conversão para registrar quem converteu
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
BEGIN
    -- 1. Obter dados da posse
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item em consignação não encontrado ou já processado.';
    END IF;

    -- 2. Marcar transação como conversão
    PERFORM set_config('app.is_posse_conversion', 'true', true);

    -- 3. Registrar a venda
    v_itens := jsonb_build_array(
        jsonb_build_object(
            'produto_id', v_posse.produto_id,
            'quantidade', v_posse.quantidade,
            'valor_unitario', (SELECT preco_venda FROM public.produtos WHERE id = v_posse.produto_id)
        )
    );
    v_venda_id := public.registrar_venda_transacional(p_cliente_id, v_itens);

    -- 4. Atualizar status da posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- 5. Registrar na auditoria detalhada
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

-- 5. Atualizar RPC de Devolução para registrar na auditoria
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
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item não encontrado ou já processado.';
    END IF;

    UPDATE public.posses SET status = 'devolvido' WHERE id = p_posse_id;

    -- Registrar na auditoria
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
        'devolucao_consignacao',
        v_posse.quantidade,
        'posses',
        p_posse_id,
        jsonb_build_object('info', 'Devolvido ao estoque principal')
    );
END;
$$;
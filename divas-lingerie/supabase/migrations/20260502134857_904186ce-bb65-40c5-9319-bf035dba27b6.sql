-- 1. Criar a tabela de auditoria de estoque
CREATE TABLE IF NOT EXISTS public.auditoria_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    usuario_id UUID REFERENCES auth.users(id),
    produto_id UUID REFERENCES public.produtos(id) NOT NULL,
    tipo_movimentacao TEXT NOT NULL, -- 'venda', 'consignacao', 'devolucao', 'ajuste_manual', 'conversao'
    quantidade_alterada INTEGER NOT NULL,
    estoque_anterior INTEGER NOT NULL,
    estoque_atual INTEGER NOT NULL,
    venda_id UUID REFERENCES public.vendas(id) ON DELETE SET NULL,
    posse_id UUID REFERENCES public.posses(id) ON DELETE SET NULL,
    observacao TEXT
);

-- 2. Habilitar RLS
ALTER TABLE public.auditoria_estoque ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de segurança (Apenas leitura para autenticados com permissão)
CREATE POLICY "Staff can view inventory audit" ON public.auditoria_estoque
FOR SELECT TO authenticated
USING (public.has_permission('auditoria.visualizar'));

-- 4. Função para registrar movimentação automaticamente via Trigger
CREATE OR REPLACE FUNCTION public.fn_audit_estoque_change()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo TEXT := 'ajuste_manual';
    v_venda_id UUID := NULL;
    v_posse_id UUID := NULL;
    v_usuario_id UUID := auth.uid();
BEGIN
    -- Se não houver mudança no estoque, não faz nada
    IF OLD.estoque = NEW.estoque THEN
        RETURN NEW;
    END IF;

    -- Tentar identificar o contexto da mudança via variáveis de sessão do Postgres
    -- Estas variáveis são definidas nas funções registrar_venda_transacional e converter_posse_em_venda
    BEGIN
        v_tipo := current_setting('app.movimentacao_tipo', true);
        v_venda_id := NULLIF(current_setting('app.venda_id', true), '')::uuid;
        v_posse_id := NULLIF(current_setting('app.posse_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        -- Se não estiverem setadas, v_tipo continua 'ajuste_manual'
    END;

    INSERT INTO public.auditoria_estoque (
        usuario_id,
        produto_id,
        tipo_movimentacao,
        quantidade_alterada,
        estoque_anterior,
        estoque_atual,
        venda_id,
        posse_id
    ) VALUES (
        v_usuario_id,
        NEW.id,
        COALESCE(v_tipo, 'ajuste_manual'),
        NEW.estoque - OLD.estoque,
        OLD.estoque,
        NEW.estoque,
        v_venda_id,
        v_posse_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Criar o trigger na tabela produtos
DROP TRIGGER IF EXISTS tr_audit_estoque_change ON public.produtos;
CREATE TRIGGER tr_audit_estoque_change
AFTER UPDATE OF estoque ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_estoque_change();

-- 6. Atualizar as funções de negócio para setar o contexto da auditoria
-- Atualizando registrar_venda_transacional
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
    PERFORM 1 FROM public.produtos WHERE id IN (SELECT (value->>'produto_id')::uuid FROM jsonb_array_elements(p_itens)) ORDER BY id FOR UPDATE;

    INSERT INTO public.vendas (cliente_id, total, data)
    VALUES (p_cliente_id, 0, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- Definir contexto para a auditoria
    PERFORM set_config('app.movimentacao_tipo', 'venda', true);
    PERFORM set_config('app.venda_id', v_venda_id::text, true);

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item->>'produto_id')::uuid;
        v_quantidade := (v_item->>'quantidade')::int;

        IF (SELECT estoque FROM public.produtos WHERE id = v_produto_id) < v_quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_produto_id;
        END IF;

        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
        VALUES (v_venda_id, v_produto_id, v_quantidade, (v_item->>'valor_unitario')::numeric);
        
        v_total_calculado := v_total_calculado + (v_quantidade * (v_item->>'valor_unitario')::numeric);
    END LOOP;

    IF p_total_esperado IS NOT NULL AND ABS(p_total_esperado - v_total_calculado) > 0.01 THEN
        RAISE EXCEPTION 'Total enviado (%) não confere com o total calculado (%)', p_total_esperado, v_total_calculado;
    END IF;

    RETURN v_venda_id;
END;
$$;

-- Atualizar marcar_posse_como_devolvida_transacional
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
    IF NOT FOUND THEN RAISE EXCEPTION 'Item em consignação não encontrado.'; END IF;
    PERFORM 1 FROM public.produtos WHERE id = v_posse.produto_id FOR UPDATE;

    -- Definir contexto para a auditoria
    PERFORM set_config('app.movimentacao_tipo', 'devolucao', true);
    PERFORM set_config('app.posse_id', p_posse_id::text, true);

    UPDATE public.posses SET status = 'devolvido' WHERE id = p_posse_id;
END;
$$;

-- Atualizar converter_posse_em_venda
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
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item em consignação não encontrado.'; END IF;
    SELECT valor_venda INTO v_preco FROM public.produtos WHERE id = v_posse.produto_id FOR UPDATE;

    -- Definir contexto para a auditoria (Sinalizar conversão)
    PERFORM set_config('app.is_posse_conversion', 'true', true);
    PERFORM set_config('app.movimentacao_tipo', 'conversao', true);
    PERFORM set_config('app.posse_id', p_posse_id::text, true);

    v_itens := jsonb_build_array(jsonb_build_object('produto_id', v_posse.produto_id, 'quantidade', v_posse.quantidade, 'valor_unitario', v_preco));
    v_venda_id := public.registrar_venda_transacional(p_cliente_id, v_itens, (v_posse.quantidade * v_preco));

    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;
    
    PERFORM set_config('app.is_posse_conversion', 'false', true);
    RETURN v_venda_id;
END;
$$;
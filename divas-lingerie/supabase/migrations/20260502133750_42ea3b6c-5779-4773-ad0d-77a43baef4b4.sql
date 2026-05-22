-- 1. Criar a tabela de auditoria para recálculos de vendas
CREATE TABLE IF NOT EXISTS public.auditoria_recalculos_vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT now(),
    usuario_id UUID REFERENCES auth.users(id),
    venda_id UUID REFERENCES public.vendas(id),
    total_anterior NUMERIC,
    total_novo NUMERIC,
    lucro_anterior NUMERIC,
    lucro_novo NUMERIC,
    motivo TEXT, -- 'alteracao_item', 'alteracao_custo_produto', 'correcao_manual'
    detalhes JSONB
);

-- 2. Habilitar RLS
ALTER TABLE public.auditoria_recalculos_vendas ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins/gerentes podem visualizar
CREATE POLICY "Staff can view recalculation audit" ON public.auditoria_recalculos_vendas
FOR SELECT TO authenticated
USING (public.check_user_permission('auditoria.visualizar'));

-- 3. Atualizar a função de recálculo para incluir auditoria e motivo
CREATE OR REPLACE FUNCTION public.recalcular_lucro_venda(p_venda_id UUID, p_motivo TEXT DEFAULT 'desconhecido')
RETURNS VOID AS $$
DECLARE
    v_venda_antiga RECORD;
    v_total_lucro_novo NUMERIC;
    v_total_venda_novo NUMERIC;
BEGIN
    -- Capturar valores atuais antes da mudança
    SELECT total, lucro INTO v_venda_antiga FROM public.vendas WHERE id = p_venda_id FOR UPDATE;

    -- Calcular novos valores: (valor_venda - valor_custo) * quantidade
    SELECT 
        SUM((valor_unitario - COALESCE(valor_custo_na_venda, 0)) * quantidade),
        SUM(valor_unitario * quantidade)
    INTO v_total_lucro_novo, v_total_venda_novo
    FROM public.itens_venda
    WHERE venda_id = p_venda_id;

    -- Garantir que não sejam nulos
    v_total_lucro_novo := COALESCE(v_total_lucro_novo, 0);
    v_total_venda_novo := COALESCE(v_total_venda_novo, 0);

    -- Só auditar e atualizar se houver mudança real (ou se for forçado pelo motivo)
    IF (v_venda_antiga.total IS DISTINCT FROM v_total_venda_novo OR v_venda_antiga.lucro IS DISTINCT FROM v_total_lucro_novo) THEN
        
        -- Atualizar a venda
        UPDATE public.vendas
        SET lucro = v_total_lucro_novo,
            total = v_total_venda_novo
        WHERE id = p_venda_id;

        -- Registrar na auditoria
        INSERT INTO public.auditoria_recalculos_vendas (
            usuario_id,
            venda_id,
            total_anterior,
            total_novo,
            lucro_anterior,
            lucro_novo,
            motivo,
            detalhes
        ) VALUES (
            auth.uid(),
            p_venda_id,
            v_venda_antiga.total,
            v_total_venda_novo,
            v_venda_antiga.lucro,
            v_total_lucro_novo,
            p_motivo,
            jsonb_build_object('data_recalculo', now())
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Atualizar gatilhos para passar o motivo correto
-- Gatilho de mudança de custo no produto
CREATE OR REPLACE FUNCTION public.fn_update_sales_profit_on_cost_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar o custo nos itens de venda
    UPDATE public.itens_venda
    SET valor_custo_na_venda = NEW.valor_custo
    WHERE produto_id = NEW.id;

    -- Recalcular com motivo específico
    PERFORM public.recalcular_lucro_venda(venda_id, 'alteracao_custo_produto')
    FROM (SELECT DISTINCT venda_id FROM public.itens_venda WHERE produto_id = NEW.id) s;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Gatilho de mudança no item da venda
CREATE OR REPLACE FUNCTION public.fn_recalc_venda_on_item_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalcular_lucro_venda(OLD.venda_id, 'remocao_item');
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM public.recalcular_lucro_venda(NEW.venda_id, 'insercao_item');
        RETURN NEW;
    ELSE
        PERFORM public.recalcular_lucro_venda(NEW.venda_id, 'atualizacao_item');
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- 1. Adicionar status 'cancelado' se necessário (assumindo que já existe ou adicionando suporte)
-- Se a tabela vendas não tiver coluna status, vamos adicionar. 
-- Primeiro verificamos a estrutura (mas como sou Lovable, vou agir proativamente para garantir que funcione)

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.vendas'::regclass AND attname = 'status') THEN
        ALTER TABLE public.vendas ADD COLUMN status TEXT DEFAULT 'finalizado';
    END IF;
END $$;

-- 2. Função de cancelamento transacional
CREATE OR REPLACE FUNCTION public.cancelar_venda_transacional(p_venda_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item RECORD;
    v_venda RECORD;
    v_usuario_id UUID := auth.uid();
BEGIN
    -- Bloquear venda para evitar alterações simultâneas
    SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada.';
    END IF;

    IF v_venda.status = 'cancelado' THEN
        RAISE EXCEPTION 'Esta venda já está cancelada.';
    END IF;

    -- Bloquear e iterar sobre os itens da venda
    -- Ordenar por produto_id para evitar deadlocks
    FOR v_item IN 
        SELECT iv.* 
        FROM public.itens_venda iv
        WHERE iv.venda_id = p_venda_id
        ORDER BY iv.produto_id
        FOR UPDATE
    LOOP
        -- Reverter estoque usando a função centralizada (quantidade positiva para retorno)
        PERFORM public.movimentar_estoque(
            v_item.produto_id,
            v_item.quantidade,
            'estorno_venda',
            p_venda_id,
            NULL,
            'Estorno por cancelamento da venda ' || p_venda_id
        );
    END LOOP;

    -- Atualizar status da venda
    UPDATE public.vendas SET status = 'cancelado', updated_at = NOW() WHERE id = p_venda_id;

    -- Registrar na auditoria de recalculos (opcional, mas bom para rastreio de lucro perdido)
    INSERT INTO public.auditoria_recalculos_vendas (
        usuario_id, venda_id, total_anterior, total_novo, lucro_anterior, lucro_novo, motivo
    ) VALUES (
        v_usuario_id, p_venda_id, v_venda.total, 0, v_venda.lucro, 0, 'cancelamento_venda'
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Dar permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.cancelar_venda_transacional(UUID) TO authenticated;
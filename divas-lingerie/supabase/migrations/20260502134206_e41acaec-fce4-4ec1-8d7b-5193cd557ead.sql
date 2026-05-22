-- 1. Corrigir a função de conversão com o nome de coluna correto
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

    -- 3. Registrar a venda (CORREÇÃO: valor_venda em vez de preco_venda)
    v_itens := jsonb_build_array(
        jsonb_build_object(
            'produto_id', v_posse.produto_id,
            'quantidade', v_posse.quantidade,
            'valor_unitario', (SELECT valor_venda FROM public.produtos WHERE id = v_posse.produto_id)
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
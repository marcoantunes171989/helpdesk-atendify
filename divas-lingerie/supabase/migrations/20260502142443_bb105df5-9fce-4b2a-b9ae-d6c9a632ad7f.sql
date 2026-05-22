-- 1. Corrigir a função RPC de conversão
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda(p_posse_id uuid, p_cliente_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_preco NUMERIC;
BEGIN
    -- Definir flag de sessão para os triggers saberem que é uma conversão
    -- Isso evita dupla baixa de estoque no trigger tr_sale_item_stock
    PERFORM set_config('app.is_posse_conversion', 'true', true);

    -- Bloqueio pessimista para evitar condições de corrida
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id AND status = 'em_posse' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Consignação não encontrada ou já processada.'; END IF;

    SELECT valor_venda INTO v_preco FROM public.produtos WHERE id = v_posse.produto_id;

    -- Criar venda
    INSERT INTO public.vendas (cliente_id, total, data)
    VALUES (p_cliente_id, (v_posse.quantidade * v_preco), CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- Criar item da venda
    -- O trigger tr_sale_item_stock agora verificará current_setting('app.is_posse_conversion')
    INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
    VALUES (v_venda_id, v_posse.produto_id, v_posse.quantidade, v_preco);

    -- Atualizar posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    -- Registrar auditoria de estoque como CONVERSÃO
    INSERT INTO public.auditoria_estoque (
        usuario_id, produto_id, tipo_movimentacao, quantidade_alterada,
        estoque_anterior, estoque_atual, venda_id, posse_id, observacao
    ) VALUES (
        auth.uid(), v_posse.produto_id, 'conversao', 0,
        (SELECT estoque FROM public.produtos WHERE id = v_posse.produto_id),
        (SELECT estoque FROM public.produtos WHERE id = v_posse.produto_id),
        v_venda_id, p_posse_id, 'Conversão de consignação em venda'
    );

    RETURN v_venda_id;
END;
$function$;

-- 2. Criar rotina de teste unitário
CREATE OR REPLACE FUNCTION public.test_posse_to_venda_stock_consistency()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_produto_id UUID;
    v_cliente_id UUID;
    v_posse_id UUID;
    v_estoque_inicial INTEGER;
    v_estoque_apos_posse INTEGER;
    v_estoque_apos_venda INTEGER;
BEGIN
    -- Setup: Criar produto e cliente de teste
    INSERT INTO public.produtos (nome, descricao, estoque, valor_venda, valor_custo)
    VALUES ('Produto Teste', 'Teste de Estoque', 100, 50, 20)
    RETURNING id, estoque INTO v_produto_id, v_estoque_inicial;

    INSERT INTO public.clientes (nome, email)
    VALUES ('Cliente Teste', 'teste@example.com')
    RETURNING id INTO v_cliente_id;

    -- Passo 1: Criar posse (deve baixar 10 do estoque)
    INSERT INTO public.posses (cliente_id, produto_id, quantidade, status)
    VALUES (v_cliente_id, v_produto_id, 10, 'em_posse')
    RETURNING id INTO v_posse_id;

    SELECT estoque INTO v_estoque_apos_posse FROM public.produtos WHERE id = v_produto_id;
    
    IF v_estoque_apos_posse <> (v_estoque_inicial - 10) THEN
        RAISE EXCEPTION 'Erro no passo 1: Estoque após posse deveria ser %, mas é %', (v_estoque_inicial - 10), v_estoque_apos_posse;
    END IF;

    -- Passo 2: Converter em venda (não deve baixar o estoque novamente)
    PERFORM public.converter_posse_em_venda(v_posse_id, v_cliente_id);

    SELECT estoque INTO v_estoque_apos_venda FROM public.produtos WHERE id = v_produto_id;

    IF v_estoque_apos_venda <> v_estoque_apos_posse THEN
        RAISE EXCEPTION 'Erro crítico de consistência: Conversão em venda baixou o estoque novamente! (Anterior: %, Atual: %)', v_estoque_apos_posse, v_estoque_apos_venda;
    END IF;

    -- Cleanup
    DELETE FROM public.itens_venda WHERE produto_id = v_produto_id;
    DELETE FROM public.vendas WHERE cliente_id = v_cliente_id;
    DELETE FROM public.posses WHERE id = v_posse_id;
    DELETE FROM public.clientes WHERE id = v_cliente_id;
    DELETE FROM public.produtos WHERE id = v_produto_id;

    RETURN 'Teste concluído com sucesso: O estoque foi atualizado exatamente uma vez (na criação da posse) e preservado na conversão.';
END;
$$;
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
    INSERT INTO public.produtos (codigo, descricao, estoque, valor_venda, valor_custo)
    VALUES ('TST-002', 'Produto Teste - Consistência v2', 100, 50, 20)
    RETURNING id, estoque INTO v_produto_id, v_estoque_inicial;

    INSERT INTO public.clientes (nome)
    VALUES ('Cliente Teste de Conversão v2')
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
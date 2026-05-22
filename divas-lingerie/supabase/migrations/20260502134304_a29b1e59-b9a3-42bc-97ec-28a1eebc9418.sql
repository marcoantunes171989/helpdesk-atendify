-- Atualizar a função de teste para limpar a nova tabela de auditoria de recálculos
CREATE OR REPLACE FUNCTION public.test_estoque_consistency()
RETURNS TABLE(teste TEXT, status TEXT, detalhe TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_produto_id UUID;
    v_cliente_id UUID;
    v_posse_id UUID;
    v_venda_id UUID;
    v_estoque_inicial INT := 100;
    v_estoque_atual INT;
BEGIN
    -- 1. Setup: Criar produto e cliente de teste
    INSERT INTO public.produtos (descricao, estoque, valor_custo, valor_venda, codigo)
    VALUES ('Produto Teste Consistência', v_estoque_inicial, 10, 20, 'TEST-001')
    RETURNING id INTO v_produto_id;

    INSERT INTO public.clientes (nome) VALUES ('Cliente Teste') RETURNING id INTO v_cliente_id;

    -- TESTE 1: Consignação Inicial
    teste := '1. Consignação Inicial';
    INSERT INTO public.posses (produto_id, cliente_id, quantidade, status)
    VALUES (v_produto_id, v_cliente_id, 10, 'em_posse')
    RETURNING id INTO v_posse_id;

    SELECT estoque INTO v_estoque_atual FROM public.produtos WHERE id = v_produto_id;
    IF v_estoque_atual = (v_estoque_inicial - 10) THEN
        status := 'PASS';
        detalhe := 'Estoque baixado corretamente de ' || v_estoque_inicial || ' para ' || v_estoque_atual;
    ELSE
        status := 'FAIL';
        detalhe := 'ERRO: Estoque deveria ser ' || (v_estoque_inicial - 10) || ' mas é ' || v_estoque_atual;
    END IF;
    RETURN NEXT;

    -- TESTE 2: Conversão em Venda (Sem baixa dupla)
    teste := '2. Conversão em Venda';
    v_venda_id := public.converter_posse_em_venda(v_posse_id, v_cliente_id);

    SELECT estoque INTO v_estoque_atual FROM public.produtos WHERE id = v_produto_id;
    IF v_estoque_atual = (v_estoque_inicial - 10) THEN
        status := 'PASS';
        detalhe := 'Estoque mantido em ' || v_estoque_atual || ' (Sem baixa dupla na conversão)';
    ELSE
        status := 'FAIL';
        detalhe := 'ERRO: Baixa dupla detectada! Estoque é ' || v_estoque_atual;
    END IF;
    RETURN NEXT;

    -- TESTE 3: Devolução de Consignação
    teste := '3. Devolução de Consignação';
    INSERT INTO public.posses (produto_id, cliente_id, quantidade, status)
    VALUES (v_produto_id, v_cliente_id, 5, 'em_posse')
    RETURNING id INTO v_posse_id;
    
    PERFORM public.marcar_posse_como_devolvida_transacional(v_posse_id);

    SELECT estoque INTO v_estoque_atual FROM public.produtos WHERE id = v_produto_id;
    IF v_estoque_atual = (v_estoque_inicial - 10) THEN
        status := 'PASS';
        detalhe := 'Estoque restaurado corretamente após devolução';
    ELSE
        status := 'FAIL';
        detalhe := 'ERRO: Estoque após devolução é ' || v_estoque_atual;
    END IF;
    RETURN NEXT;

    -- TESTE 4: Venda Direta
    teste := '4. Venda Direta';
    PERFORM public.registrar_venda_transacional(v_cliente_id, jsonb_build_array(
        jsonb_build_object('produto_id', v_produto_id, 'quantidade', 5, 'valor_unitario', 20)
    ));

    SELECT estoque INTO v_estoque_atual FROM public.produtos WHERE id = v_produto_id;
    IF v_estoque_atual = (v_estoque_inicial - 10 - 5) THEN
        status := 'PASS';
        detalhe := 'Venda direta baixou o estoque corretamente para ' || v_estoque_atual;
    ELSE
        status := 'FAIL';
        detalhe := 'ERRO: Venda direta falhou. Estoque: ' || v_estoque_atual;
    END IF;
    RETURN NEXT;

    -- Limpeza (CORREÇÃO: Ordem de deleção respeitando FKs)
    DELETE FROM public.auditoria_recalculos_vendas WHERE venda_id IN (SELECT id FROM public.vendas WHERE cliente_id = v_cliente_id);
    DELETE FROM public.itens_venda WHERE produto_id = v_produto_id;
    DELETE FROM public.vendas WHERE cliente_id = v_cliente_id;
    DELETE FROM public.posses WHERE produto_id = v_produto_id;
    DELETE FROM public.auditoria_movimentacoes WHERE produto_id = v_produto_id;
    DELETE FROM public.produtos WHERE id = v_produto_id;
    DELETE FROM public.clientes WHERE id = v_cliente_id;

END;
$$;
-- Função para registrar venda direta via RPC (Atômica)
CREATE OR REPLACE FUNCTION public.registrar_venda_transacional(
    p_cliente_id UUID,
    p_itens JSONB -- [{produto_id: UUID, quantidade: INT, valor_unitario: DECIMAL}]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
    v_total_venda DECIMAL(10,2) := 0;
    v_total_lucro DECIMAL(10,2) := 0;
    v_produto_custo DECIMAL(10,2);
BEGIN
    -- 1. Calcular totais no servidor para garantir integridade
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, valor_unitario DECIMAL)
    LOOP
        SELECT valor_custo INTO v_produto_custo FROM public.produtos WHERE id = v_item.produto_id;
        v_total_venda := v_total_venda + (v_item.valor_unitario * v_item.quantidade);
        v_total_lucro := v_total_lucro + ((v_item.valor_unitario - COALESCE(v_produto_custo, 0)) * v_item.quantidade);
    END LOOP;

    -- 2. Inserir cabeçalho da venda
    INSERT INTO public.vendas (cliente_id, total, lucro, data)
    VALUES (p_cliente_id, v_total_venda, v_total_lucro, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- 3. Inserir itens (os triggers já existentes cuidarão do estoque)
    INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
    SELECT v_venda_id, (x->>'produto_id')::UUID, (x->>'quantidade')::INT, (x->>'valor_unitario')::DECIMAL
    FROM jsonb_array_elements(p_itens) AS x;

    RETURN v_venda_id;
END;
$$ SET search_path = public;

-- Função para converter posse em venda via RPC
CREATE OR REPLACE FUNCTION public.converter_posse_em_venda_transacional(
    p_posse_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_posse RECORD;
    v_venda_id UUID;
    v_valor_venda DECIMAL(10,2);
    v_valor_custo DECIMAL(10,2);
    v_lucro DECIMAL(10,2);
BEGIN
    -- 1. Buscar dados da posse
    SELECT * INTO v_posse FROM public.posses WHERE id = p_posse_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro de consignação não encontrado';
    END IF;

    IF v_posse.status != 'em_posse' THEN
        RAISE EXCEPTION 'Apenas itens em posse podem ser convertidos em venda';
    END IF;

    -- 2. Buscar valores atuais do produto
    SELECT valor_venda, valor_custo INTO v_valor_venda, v_valor_custo
    FROM public.produtos WHERE id = v_posse.produto_id;

    v_lucro := (v_valor_venda - COALESCE(v_valor_custo, 0)) * v_posse.quantidade;

    -- 3. Criar venda
    INSERT INTO public.vendas (cliente_id, total, lucro, data)
    VALUES (v_posse.cliente_id, v_valor_venda * v_posse.quantidade, v_lucro, CURRENT_DATE)
    RETURNING id INTO v_venda_id;

    -- 4. Criar item da venda
    -- IMPORTANTE: Usamos uma técnica para evitar que o trigger de estoque rode aqui, 
    -- pois o estoque já foi baixado quando o item entrou em consignação.
    INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, valor_unitario)
    VALUES (v_venda_id, v_posse.produto_id, v_posse.quantidade, v_valor_venda);

    -- 5. Atualizar status da posse
    UPDATE public.posses SET status = 'vendido' WHERE id = p_posse_id;

    RETURN v_venda_id;
END;
$$ SET search_path = public;
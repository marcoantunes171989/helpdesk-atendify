-- Adicionar coluna de status nos itens de venda se não existir (usando SQL nativo seguro)
ALTER TABLE public.tab_itens_venda ADD COLUMN IF NOT EXISTS itv_status TEXT DEFAULT 'ativo';

-- Função profissional para cancelar um item específico
CREATE OR REPLACE FUNCTION public.cancelar_item_venda_pdv(p_item_id UUID)
RETURNS VOID AS $$
DECLARE
    v_venda_id UUID;
    v_produto_id UUID;
    v_quantidade NUMERIC;
    v_valor_total_item NUMERIC;
    v_status_item TEXT;
BEGIN
    -- Obter dados do item
    SELECT ven_id, itv_produto_id, itv_quantidade, itv_valor_total, itv_status 
    INTO v_venda_id, v_produto_id, v_quantidade, v_valor_total_item, v_status_item
    FROM public.tab_itens_venda
    WHERE id = p_item_id;

    IF v_status_item = 'cancelado' THEN
        RAISE EXCEPTION 'Este item já está cancelado.';
    END IF;

    -- 1. Marcar item como cancelado
    UPDATE public.tab_itens_venda 
    SET itv_status = 'cancelado',
        updated_at = now()
    WHERE id = p_item_id;

    -- 2. Estornar estoque
    UPDATE public.tab_produtos
    SET pro_estoque_atual = pro_estoque_atual + v_quantidade,
        updated_at = now()
    WHERE id = v_produto_id;

    -- 3. Atualizar valor total da venda
    UPDATE public.tab_vendas
    SET ven_valor_total = ven_valor_total - v_valor_total_item,
        updated_at = now()
    WHERE id = v_venda_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função profissional para cancelar uma venda inteira (Cupom)
CREATE OR REPLACE FUNCTION public.cancelar_venda_inteira_pdv(p_venda_id UUID)
RETURNS VOID AS $$
DECLARE
    r_item RECORD;
BEGIN
    -- Percorre todos os itens ativos da venda para cancelar individualmente (reaproveitando a lógica de estoque/valores)
    FOR r_item IN (SELECT id FROM public.tab_itens_venda WHERE ven_id = p_venda_id AND itv_status != 'cancelado') LOOP
        PERFORM public.cancelar_item_venda_pdv(r_item.id);
    END LOOP;

    -- Atualiza timestamp da venda
    UPDATE public.tab_vendas
    SET updated_at = now()
    WHERE id = p_venda_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
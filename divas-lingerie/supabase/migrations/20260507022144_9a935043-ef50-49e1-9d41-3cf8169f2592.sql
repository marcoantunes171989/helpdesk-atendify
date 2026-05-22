-- Add status to items
ALTER TABLE public.tab_itens_venda ADD COLUMN IF NOT EXISTS itv_status TEXT DEFAULT 'ativo';

-- Update stock low trigger to ignore cancelled items
CREATE OR REPLACE FUNCTION public.proc_baixa_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.itv_status = 'ativo' THEN
        UPDATE public.tab_produtos
        SET pro_estoque_atual = COALESCE(pro_estoque_atual, 0) - NEW.itv_quantidade
        WHERE id = NEW.itv_produto_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update stock refund trigger to ignore cancelled items (since they didn't reduce stock)
CREATE OR REPLACE FUNCTION public.estornar_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    -- If it was active, we should restore stock on DELETE
    -- But if we are just marking as cancelled, we don't restore stock (as requested "garantindo que o estoque desses itens não seja atualizado")
    IF OLD.itv_status = 'ativo' THEN
        UPDATE public.tab_produtos
        SET pro_estoque_atual = COALESCE(pro_estoque_atual, 0) + OLD.itv_quantidade
        WHERE id = OLD.itv_produto_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel an item
CREATE OR REPLACE FUNCTION public.cancelar_item_venda(p_item_id UUID)
RETURNS VOID AS $$
DECLARE
    v_venda_id UUID;
    v_valor_cancelado NUMERIC;
BEGIN
    -- Update item status
    UPDATE public.tab_itens_venda
    SET itv_status = 'cancelado'
    WHERE id = p_item_id
    RETURNING itv_venda_id, itv_valor_total INTO v_venda_id, v_valor_cancelado;

    -- Update sale total
    UPDATE public.tab_vendas
    SET ven_valor_total = ven_valor_total - v_valor_cancelado
    WHERE id = v_venda_id;

    -- Update payments proportionately (or just mark total as adjusted)
    -- This is a simple implementation: subtract from the first payment or record a negative adjustment
    -- For now, we adjust the total sale value which reflects in reports.
END;
$$ LANGUAGE plpgsql;

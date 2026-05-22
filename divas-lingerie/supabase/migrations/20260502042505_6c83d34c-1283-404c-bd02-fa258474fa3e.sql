-- 1. Function to recalculate total and profit for a sale
CREATE OR REPLACE FUNCTION public.recalculate_venda_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_venda_id UUID;
    v_total NUMERIC(15,2);
    v_lucro NUMERIC(15,2);
BEGIN
    -- Determine which venda_id to process
    IF (TG_OP = 'DELETE') THEN
        v_venda_id := OLD.venda_id;
    ELSE
        v_venda_id := NEW.venda_id;
    END IF;

    -- Calculate total and profit by joining with produtos to get costs
    SELECT 
        COALESCE(SUM(iv.quantidade * iv.valor_unitario), 0),
        COALESCE(SUM(iv.quantidade * (iv.valor_unitario - p.valor_custo)), 0)
    INTO v_total, v_lucro
    FROM public.itens_venda iv
    JOIN public.produtos p ON iv.produto_id = p.id
    WHERE iv.venda_id = v_venda_id;

    -- Update the parent venda record
    UPDATE public.vendas
    SET total = v_total,
        lucro = v_lucro
    WHERE id = v_venda_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create triggers on itens_venda
DROP TRIGGER IF EXISTS tr_recalculate_venda_on_item_change ON public.itens_venda;
CREATE TRIGGER tr_recalculate_venda_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.itens_venda
FOR EACH ROW EXECUTE FUNCTION public.recalculate_venda_totals();

-- 3. Also handle changes in product costs/prices (optional but good for consistency)
-- If a product's cost changes, we might want to update historical profits, 
-- but usually, we only care about calculations at the time of sale.
-- Since itens_venda stores valor_unitario (sale price at time of sale), 
-- we only need to join with produtos to get the current/cost price if it's not stored in itens_venda.

-- To be extra safe, let's make sure our registrar_venda_transacional RPC doesn't conflict 
-- by allowing the triggers to do their work.

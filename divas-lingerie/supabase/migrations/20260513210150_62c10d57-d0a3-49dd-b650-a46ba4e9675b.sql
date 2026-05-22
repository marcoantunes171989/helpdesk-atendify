-- Add the column to tab_produtos
ALTER TABLE public.tab_produtos 
ADD COLUMN IF NOT EXISTS pro_valor_total NUMERIC(15, 2) DEFAULT 0;

-- Create a function to calculate the total value
CREATE OR REPLACE FUNCTION public.fn_update_produto_valor_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total value: unit price (venda) * current stock
  NEW.pro_valor_total := COALESCE(NEW.pro_valor_venda, 0) * COALESCE(NEW.pro_estoque_atual, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_update_produto_valor_total ON public.tab_produtos;
CREATE TRIGGER tr_update_produto_valor_total
BEFORE INSERT OR UPDATE OF pro_valor_venda, pro_estoque_atual ON public.tab_produtos
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_produto_valor_total();

-- Update existing records
UPDATE public.tab_produtos 
SET pro_valor_total = COALESCE(pro_valor_venda, 0) * COALESCE(pro_estoque_atual, 0);
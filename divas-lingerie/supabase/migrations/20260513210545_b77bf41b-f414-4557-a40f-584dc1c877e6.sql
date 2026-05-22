-- Ensure columns are NOT NULL
ALTER TABLE public.tab_produtos 
ALTER COLUMN pro_categoria_id SET NOT NULL,
ALTER COLUMN pro_tamanho_id SET NOT NULL,
ALTER COLUMN pro_cor_id SET NOT NULL;

-- Add index for category if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.tab_produtos (pro_categoria_id);

-- Create a procedure to validate product data (extra layer of protection)
CREATE OR REPLACE FUNCTION public.check_product_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pro_categoria_id IS NULL THEN
    RAISE EXCEPTION 'A categoria do produto é obrigatória.';
  END IF;
  IF NEW.pro_tamanho_id IS NULL THEN
    RAISE EXCEPTION 'O tamanho do produto é obrigatório.';
  END IF;
  IF NEW.pro_cor_id IS NULL THEN
    RAISE EXCEPTION 'A cor do produto é obrigatória.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce integrity before insert or update
DROP TRIGGER IF EXISTS trg_check_product_integrity ON public.tab_produtos;
CREATE TRIGGER trg_check_product_integrity
BEFORE INSERT OR UPDATE ON public.tab_produtos
FOR EACH ROW
EXECUTE FUNCTION public.check_product_integrity();

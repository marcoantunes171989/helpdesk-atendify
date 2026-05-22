ALTER TABLE public.tab_clientes 
ADD COLUMN IF NOT EXISTS cli_numero TEXT,
ADD COLUMN IF NOT EXISTS cli_bairro TEXT;
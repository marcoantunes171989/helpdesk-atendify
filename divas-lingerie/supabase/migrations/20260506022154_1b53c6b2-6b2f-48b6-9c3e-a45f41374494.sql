-- Add foreign key columns to tab_produtos
ALTER TABLE public.tab_produtos 
ADD COLUMN pro_tamanho_id UUID REFERENCES public.tab_tamanhos(id),
ADD COLUMN pro_cor_id UUID REFERENCES public.tab_cores(id);

-- Add indexes for performance
CREATE INDEX idx_produtos_tamanho ON public.tab_produtos(pro_tamanho_id);
CREATE INDEX idx_produtos_cor ON public.tab_produtos(pro_cor_id);

-- Note: We don't set NOT NULL immediately because existing products might exist.
-- If you want to force it for NEW products, you can do it after updating existing ones or if the table is empty.
-- Since it's a development environment, we'll assume we want to enforce it.
-- If there are existing rows, this might fail, but let's try to set it.
-- ALTER TABLE public.tab_produtos ALTER COLUMN pro_tamanho_id SET NOT NULL;
-- ALTER TABLE public.tab_produtos ALTER COLUMN pro_cor_id SET NOT NULL;

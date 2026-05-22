-- Reinforce RLS for tab_tamanhos
ALTER TABLE public.tab_tamanhos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sizes" ON public.tab_tamanhos;
DROP POLICY IF EXISTS "Users can insert sizes" ON public.tab_tamanhos;
DROP POLICY IF EXISTS "Users can update sizes" ON public.tab_tamanhos;
DROP POLICY IF EXISTS "Users can delete sizes" ON public.tab_tamanhos;

CREATE POLICY "Authenticated users can view sizes" ON public.tab_tamanhos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sizes" ON public.tab_tamanhos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sizes" ON public.tab_tamanhos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sizes" ON public.tab_tamanhos FOR DELETE TO authenticated USING (true);

-- Reinforce RLS for tab_cores
ALTER TABLE public.tab_cores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view colors" ON public.tab_cores;
DROP POLICY IF EXISTS "Users can insert colors" ON public.tab_cores;
DROP POLICY IF EXISTS "Users can update colors" ON public.tab_cores;
DROP POLICY IF EXISTS "Users can delete colors" ON public.tab_cores;

CREATE POLICY "Authenticated users can view colors" ON public.tab_cores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert colors" ON public.tab_cores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update colors" ON public.tab_cores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete colors" ON public.tab_cores FOR DELETE TO authenticated USING (true);

-- Reinforce RLS for tab_produtos
ALTER TABLE public.tab_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view products" ON public.tab_produtos;
DROP POLICY IF EXISTS "Users can insert products" ON public.tab_produtos;
DROP POLICY IF EXISTS "Users can update products" ON public.tab_produtos;
DROP POLICY IF EXISTS "Users can delete products" ON public.tab_produtos;

-- Assuming there might be existing general policies, let's create specific authenticated ones
CREATE POLICY "Authenticated users can view products" ON public.tab_produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.tab_produtos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON public.tab_produtos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.tab_produtos FOR DELETE TO authenticated USING (true);

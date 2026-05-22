DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.tab_categorias;
DROP POLICY IF EXISTS "Allow app users to manage categories" ON public.tab_categorias;

CREATE POLICY "Allow app users to manage categories"
ON public.tab_categorias
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE public.tab_categorias ENABLE ROW LEVEL SECURITY;
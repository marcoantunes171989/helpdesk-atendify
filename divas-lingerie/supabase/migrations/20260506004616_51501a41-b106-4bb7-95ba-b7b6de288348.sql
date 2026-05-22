-- Check and drop conflicting policy if it exists
DROP POLICY IF EXISTS "Acesso total para usuários autenticados em clientes" ON public.tab_clientes;
DROP POLICY IF EXISTS "Enable all for authenticated users on tab_clientes" ON public.tab_clientes;

-- Create policies that allow proper access
CREATE POLICY "Enable read access for authenticated users"
ON public.tab_clientes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON public.tab_clientes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON public.tab_clientes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
ON public.tab_clientes
FOR DELETE
TO authenticated
USING (true);
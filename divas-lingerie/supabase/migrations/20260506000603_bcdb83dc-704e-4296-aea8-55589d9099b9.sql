-- Drop existing restrictive policies for tab_produtos
DROP POLICY IF EXISTS "Acesso total tab_produtos" ON public.tab_produtos;
DROP POLICY IF EXISTS "Enable all for authenticated users on tab_produtos" ON public.tab_produtos;

-- Create a new permissive policy for both anon and authenticated users
CREATE POLICY "Allow app users to manage products" 
ON public.tab_produtos 
FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.tab_produtos ENABLE ROW LEVEL SECURITY;

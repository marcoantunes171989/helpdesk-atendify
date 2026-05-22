-- Create a temporary policy for testing that allows public insertion
CREATE POLICY "Enable public insert for testing"
ON public.tab_clientes
FOR INSERT
TO public
WITH CHECK (true);

-- Ensure other operations are also accessible for public if needed during testing
CREATE POLICY "Enable public select for testing"
ON public.tab_clientes
FOR SELECT
TO public
USING (true);
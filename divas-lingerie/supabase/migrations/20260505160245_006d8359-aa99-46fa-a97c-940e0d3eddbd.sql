-- Remove redundant/conflicting policies for tab_categorias
DROP POLICY IF EXISTS "Acesso total tab_categorias" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."tab_categorias";

-- Create a clean, single policy for all operations
CREATE POLICY "Allow all operations for authenticated users" 
ON "public"."tab_categorias"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE "public"."tab_categorias" ENABLE ROW LEVEL SECURITY;
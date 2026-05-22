-- Drop all existing policies for tab_categorias to start fresh
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Public can view categories" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON "public"."tab_categorias";
DROP POLICY IF EXISTS "Permitir tudo para todos" ON "public"."tab_categorias";

-- Create a single, clear policy for authenticated users
CREATE POLICY "Enable all for authenticated users" 
ON "public"."tab_categorias" 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE "public"."tab_categorias" ENABLE ROW LEVEL SECURITY;

-- Create policies for tab_categorias
CREATE POLICY "Enable insert for authenticated users only" ON "public"."tab_categorias"
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable select for authenticated users only" ON "public"."tab_categorias"
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON "public"."tab_categorias"
FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON "public"."tab_categorias"
FOR DELETE USING (auth.role() = 'authenticated');
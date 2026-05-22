-- Policies for tab_produtos
CREATE POLICY "Enable all for authenticated users on tab_produtos" ON "public"."tab_produtos"
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Policies for tab_usuarios
CREATE POLICY "Enable all for authenticated users on tab_usuarios" ON "public"."tab_usuarios"
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Policies for tab_clientes
CREATE POLICY "Enable all for authenticated users on tab_clientes" ON "public"."tab_clientes"
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
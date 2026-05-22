-- 1. Enable RLS on all tables
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

-- 2. Helper function to check if a user has a specific permission
-- Permissions are stored in cargos.permissoes (text[])
CREATE OR REPLACE FUNCTION public.has_permission(p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions TEXT[];
BEGIN
    SELECT c.permissoes INTO user_permissions
    FROM public.perfis p
    JOIN public.cargos c ON p.cargo_id = c.id
    WHERE p.id = auth.uid();
    
    RETURN p_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Policies for 'perfis' (Profiles)
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.perfis FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.perfis FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON public.perfis FOR ALL
TO authenticated
USING (public.has_permission('admin'));

-- 4. Policies for 'cargos' (Roles)
CREATE POLICY "Cargos are viewable by authenticated users"
ON public.cargos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage cargos"
ON public.cargos FOR ALL
TO authenticated
USING (public.has_permission('admin'));

-- 5. Policies for 'categorias'
CREATE POLICY "Categorias are viewable by authenticated users"
ON public.categorias FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage categorias"
ON public.categorias FOR ALL
TO authenticated
USING (public.has_permission('admin') OR public.has_permission('gerente'));

-- 6. Policies for 'produtos'
CREATE POLICY "Produtos are viewable by authenticated users"
ON public.produtos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage products"
ON public.produtos FOR ALL
TO authenticated
USING (public.has_permission('admin') OR public.has_permission('gerente'));

-- 7. Policies for 'clientes'
CREATE POLICY "Clientes are viewable by authenticated users"
ON public.clientes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create/update clients"
ON public.clientes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clientes FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Only admins/managers can delete clients"
ON public.clientes FOR DELETE
TO authenticated
USING (public.has_permission('admin') OR public.has_permission('gerente'));

-- 8. Policies for 'vendas' and 'itens_venda'
CREATE POLICY "Vendas are viewable by authenticated users"
ON public.vendas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sales"
ON public.vendas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Itens de venda are viewable by authenticated users"
ON public.itens_venda FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sale items"
ON public.itens_venda FOR INSERT
TO authenticated
WITH CHECK (true);

-- 9. Policies for 'posses' (Consignments)
CREATE POLICY "Posses are viewable by authenticated users"
ON public.posses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage consignments"
ON public.posses FOR ALL
TO authenticated
USING (true);

-- 10. Policies for 'visitas'
CREATE POLICY "Visitas are viewable by authenticated users"
ON public.visitas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create/update visits"
ON public.visitas FOR ALL
TO authenticated
USING (true);

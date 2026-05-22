-- 1. Garantir que RLS esteja habilitado em todas as tabelas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posses_auditoria ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas redundantes ou muito permissivas (Permitir tudo)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'Permitir tudo%') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Definir políticas restritivas para Vendas e Itens
-- Vendas: Visualizar e criar
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.vendas;
CREATE POLICY "Authenticated users can create sales" ON public.vendas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Vendas are viewable by authenticated users" ON public.vendas;
CREATE POLICY "Vendas are viewable by authenticated users" ON public.vendas FOR SELECT TO authenticated USING (true);

-- Itens de Venda: Visualizar e criar
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON public.itens_venda;
CREATE POLICY "Authenticated users can create sale items" ON public.itens_venda FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Itens de venda are viewable by authenticated users" ON public.itens_venda;
CREATE POLICY "Itens de venda are viewable by authenticated users" ON public.itens_venda FOR SELECT TO authenticated USING (true);

-- 4. Definir políticas para Posses (Consignações)
DROP POLICY IF EXISTS "Authenticated users can manage consignments" ON public.posses;
CREATE POLICY "Authenticated users can manage consignments" ON public.posses FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Posses are viewable by authenticated users" ON public.posses;
CREATE POLICY "Posses are viewable by authenticated users" ON public.posses FOR SELECT TO authenticated USING (true);

-- 5. Reforçar Produtos e Clientes (Leitura para todos, Escrita para Staff)
-- Produtos
DROP POLICY IF EXISTS "Managers can manage products" ON public.produtos;
CREATE POLICY "Admins and managers can modify products" ON public.produtos 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.perfis p JOIN public.cargos c ON p.cargo_id = c.id WHERE p.id = auth.uid() AND c.nome IN ('admin', 'gerente')));

-- Clientes
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can create/update clients" ON public.clientes;
CREATE POLICY "Authenticated users can manage clients" ON public.clientes FOR ALL TO authenticated USING (true);

-- 6. Auditoria (Apenas leitura para admins/gerentes)
DROP POLICY IF EXISTS "Users can view audit logs" ON public.posses_auditoria;
CREATE POLICY "Staff can view audit logs" ON public.posses_auditoria 
FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.perfis p JOIN public.cargos c ON p.cargo_id = c.id WHERE p.id = auth.uid() AND c.nome IN ('admin', 'gerente')));

-- 7. Perfis (Segurança de identidade)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.perfis;
CREATE POLICY "Users can update their own profile" ON public.perfis 
FOR UPDATE TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- Revogar acesso direto a tabelas para o papel public (opcional, mas recomendado se quiser ser ultra-estrito)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
-- 1. Criar ou atualizar função auxiliar para verificar permissões de forma eficiente
CREATE OR REPLACE FUNCTION public.check_user_permission(required_permission text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.perfis p 
    JOIN public.cargos c ON p.cargo_id = c.id 
    WHERE p.id = auth.uid() 
    AND (required_permission = ANY(c.permissoes) OR c.nome = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ajustar políticas da tabela PRODUTOS
DROP POLICY IF EXISTS "Admins and managers can modify products" ON public.produtos;
DROP POLICY IF EXISTS "Managers can manage products" ON public.produtos;
CREATE POLICY "Staff can manage products" ON public.produtos 
FOR ALL TO authenticated 
USING (public.check_user_permission('produtos.gerenciar'))
WITH CHECK (public.check_user_permission('produtos.gerenciar'));

-- 3. Ajustar políticas da tabela CLIENTES
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clientes;
CREATE POLICY "Staff can manage clients" ON public.clientes 
FOR ALL TO authenticated 
USING (public.check_user_permission('clientes.gerenciar'))
WITH CHECK (public.check_user_permission('clientes.gerenciar'));

-- 4. Ajustar políticas da tabela VENDAS
DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.vendas;
CREATE POLICY "Staff can create sales" ON public.vendas 
FOR INSERT TO authenticated 
WITH CHECK (public.check_user_permission('vendas.criar'));

-- 5. Ajustar políticas da tabela ITENS_VENDA
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON public.itens_venda;
CREATE POLICY "Staff can create sale items" ON public.itens_venda 
FOR INSERT TO authenticated 
WITH CHECK (public.check_user_permission('vendas.criar'));

-- 6. Ajustar políticas da tabela POSSES (Consignações)
DROP POLICY IF EXISTS "Authenticated users can manage consignments" ON public.posses;
CREATE POLICY "Staff can manage consignments" ON public.posses 
FOR ALL TO authenticated 
USING (public.check_user_permission('consignacoes.gerenciar'))
WITH CHECK (public.check_user_permission('consignacoes.gerenciar'));

-- 7. Ajustar políticas da tabela CATEGORIAS
DROP POLICY IF EXISTS "Managers can manage categorias" ON public.categorias;
CREATE POLICY "Staff can manage categories" ON public.categorias 
FOR ALL TO authenticated 
USING (public.check_user_permission('configuracoes.gerenciar'))
WITH CHECK (public.check_user_permission('configuracoes.gerenciar'));

-- 8. Ajustar políticas da tabela VISITAS
DROP POLICY IF EXISTS "Authenticated users can create/update visits" ON public.visitas;
CREATE POLICY "Staff can manage visits" ON public.visitas 
FOR ALL TO authenticated 
USING (public.check_user_permission('visitas.gerenciar'))
WITH CHECK (public.check_user_permission('visitas.gerenciar'));

-- 9. Ajustar políticas da tabela CARGOS (Apenas admins)
DROP POLICY IF EXISTS "Admins can manage cargos" ON public.cargos;
CREATE POLICY "Admins can manage cargos" ON public.cargos 
FOR ALL TO authenticated 
USING (public.check_user_permission('admin.gerenciar'));

-- 10. Ajustar políticas da tabela AUDITORIA_MOVIMENTACOES (Leitura restrita)
DROP POLICY IF EXISTS "Staff can view movement audit" ON public.auditoria_movimentacoes;
CREATE POLICY "Staff can view movement audit" ON public.auditoria_movimentacoes 
FOR SELECT TO authenticated 
USING (public.check_user_permission('auditoria.visualizar'));

-- 11. Garantir que políticas de visualização continuem permitindo leitura para todos os autenticados onde necessário
-- (Produtos, Clientes, Categorias, Vendas - Geralmente todos do staff precisam ver)
CREATE POLICY "View products" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "View clients" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "View categories" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "View sales" ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "View sale items" ON public.itens_venda FOR SELECT TO authenticated USING (true);
CREATE POLICY "View consignments" ON public.posses FOR SELECT TO authenticated USING (true);
CREATE POLICY "View visits" ON public.visitas FOR SELECT TO authenticated USING (true);
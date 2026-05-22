-- Permitir inserções na tabela de auditoria por usuários autenticados (necessário para o trigger funcionar)
CREATE POLICY "Permitir inserção na auditoria por usuários autenticados" 
ON public.tab_auditoria 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Garantir que a função SECURITY DEFINER está no schema public e tem search_path setado
-- (já estava no migration anterior, mas vamos reforçar se necessário)
ALTER FUNCTION public.fn_auditoria_clientes() SET search_path = public;

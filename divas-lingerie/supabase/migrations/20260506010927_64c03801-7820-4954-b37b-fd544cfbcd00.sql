-- Remover políticas públicas se existirem
DROP POLICY IF EXISTS "Enable public insert for testing" ON public.tab_clientes;
DROP POLICY IF EXISTS "Enable public select for testing" ON public.tab_clientes;

-- Garantir que as políticas para usuários autenticados estão corretas
-- (O DROP POLICY IF EXISTS garante que podemos recriar se necessário ou apenas garantir que as atuais cobrem tudo)

-- Se já existem políticas específicas para SELECT, INSERT, UPDATE, DELETE para authenticated, elas estão boas.
-- A query anterior mostrou que elas já existem e usam (true), o que permite listar, editar e excluir sem erros de RLS.

-- Apenas para segurança, vamos garantir que a tabela de usuários também tenha políticas consistentes se houver alguma falha latente.
-- Mas o foco solicitado foi clientes.

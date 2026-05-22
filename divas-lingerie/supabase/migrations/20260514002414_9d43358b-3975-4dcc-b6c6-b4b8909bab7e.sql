-- Criar tabela de teste
CREATE TABLE public.tab_teste_conexao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tab_teste_conexao ENABLE ROW LEVEL SECURITY;

-- Criar política de leitura pública para o teste
CREATE POLICY "Leitura pública para teste" ON public.tab_teste_conexao FOR SELECT USING (true);

-- Inserir registros de exemplo
INSERT INTO public.tab_teste_conexao (nome, descricao) VALUES 
('Teste 1', 'Primeiro registro de validação'),
('Teste 2', 'Conexão Lovable + Supabase externa ativa'),
('Teste 3', 'Sucesso na integração com gknvynbcmrtyjyyzhyov');
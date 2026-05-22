-- Habilitar extensão para buscas textuais performáticas
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Índices para a tabela de Clientes
-- Busca por nome (trigram index para ILIKE '%...%')
CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm ON public.clientes USING gin (nome gin_trgm_ops);
-- Busca por telefone
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes (telefone);

-- 2. Índices para a tabela de Produtos
-- Busca por descrição (trigram index)
CREATE INDEX IF NOT EXISTS idx_produtos_descricao_trgm ON public.produtos USING gin (descricao gin_trgm_ops);
-- Busca por código e referência (buscas exatas ou prefixo)
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos (codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_referencia ON public.produtos (referencia);

-- 3. Índices para a tabela de Vendas
-- Filtro por data e ordenação
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas (data DESC);
-- Relacionamento com cliente
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas (cliente_id);

-- 4. Índices para a tabela de Posses (Consignação)
-- Filtro por status e data
CREATE INDEX IF NOT EXISTS idx_posses_status_data ON public.posses (status, data_saida DESC);
-- Relacionamentos
CREATE INDEX IF NOT EXISTS idx_posses_cliente_id ON public.posses (cliente_id);
CREATE INDEX IF NOT EXISTS idx_posses_produto_id ON public.posses (produto_id);

-- 5. Índices para Itens de Venda
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON public.itens_venda (produto_id);
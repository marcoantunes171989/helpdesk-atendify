-- 1. Indexes for Clientes (Client searches)
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes (nome);

-- 2. Indexes for Produtos (Product searches)
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos (codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_descricao ON public.produtos (descricao);

-- 3. Indexes for Vendas (Sales filtering by date and customer)
CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas (data);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.vendas (cliente_id);

-- 4. Indexes for Posses (Consignment/Sacoleira filtering)
CREATE INDEX IF NOT EXISTS idx_posses_status ON public.posses (status);
CREATE INDEX IF NOT EXISTS idx_posses_cliente_id ON public.posses (cliente_id);
CREATE INDEX IF NOT EXISTS idx_posses_produto_id ON public.posses (produto_id);

-- 5. Indexes for Visitas (Visit history)
CREATE INDEX IF NOT EXISTS idx_visitas_data ON public.visitas (data);
CREATE INDEX IF NOT EXISTS idx_visitas_cliente_id ON public.visitas (cliente_id);

-- 6. Indexes for Itens de Venda (Efficient joins)
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda (venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto_id ON public.itens_venda (produto_id);

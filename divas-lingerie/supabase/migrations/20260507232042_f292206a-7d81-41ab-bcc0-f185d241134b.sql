-- Remover chaves estrangeiras duplicadas que causam ambiguidade no PostgREST
ALTER TABLE public.tab_itens_venda DROP CONSTRAINT IF EXISTS tab_itens_venda_itv_venda_id_fkey;
ALTER TABLE public.tab_itens_venda DROP CONSTRAINT IF EXISTS tab_itens_venda_itv_produto_id_fkey;
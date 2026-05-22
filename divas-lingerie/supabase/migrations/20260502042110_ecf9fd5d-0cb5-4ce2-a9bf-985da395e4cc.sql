-- 1. Remove duplicate foreign keys to fix PostgREST embedding issues
ALTER TABLE public.itens_venda DROP CONSTRAINT IF EXISTS itens_venda_venda_id_fkey;
ALTER TABLE public.itens_venda DROP CONSTRAINT IF EXISTS itens_venda_produto_id_fkey;

-- 2. Fix security warnings: Set search_path for functions to prevent hijacking
ALTER FUNCTION public.handle_sale_item_insert() SET search_path = public;
ALTER FUNCTION public.handle_sale_item_delete() SET search_path = public;
ALTER FUNCTION public.handle_posse_status_change() SET search_path = public;
ALTER FUNCTION public.handle_posse_insert() SET search_path = public;

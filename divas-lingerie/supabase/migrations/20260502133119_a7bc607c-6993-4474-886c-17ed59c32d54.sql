-- 1. Corrigir funções customizadas do projeto (ignorar funções de extensões como pg_trgm)
ALTER FUNCTION public.handle_sale_item_delete() SET search_path = public;
ALTER FUNCTION public.handle_posse_status_change() SET search_path = public;
ALTER FUNCTION public.handle_posse_insert() SET search_path = public;
ALTER FUNCTION public.handle_sale_item_insert() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_posse_estoque_inicial() SET search_path = public;
ALTER FUNCTION public.handle_venda_estoque() SET search_path = public;
ALTER FUNCTION public.log_posses_status_change() SET search_path = public;
ALTER FUNCTION public.validate_posses_status_transition() SET search_path = public;
ALTER FUNCTION public.marcar_posse_como_devolvida_transacional(uuid) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.registrar_venda_transacional(uuid, jsonb, numeric) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.handle_sale_item_stock() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.fn_log_estoque_change() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.handle_posse_stock() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.check_user_permission(text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.converter_posse_em_venda(uuid, uuid) SECURITY DEFINER SET search_path = public;

-- 2. Garantir que RLS esteja habilitado em tabelas críticas (reforço)
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 3. Revogar execução pública de funções administrativas
REVOKE EXECUTE ON FUNCTION public.check_user_permission(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_user_permission(text) TO authenticated;
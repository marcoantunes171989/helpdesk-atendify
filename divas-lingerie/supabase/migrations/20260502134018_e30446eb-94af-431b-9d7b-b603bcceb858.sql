-- 1. Revogar execução pública de todas as funções no esquema public
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. Conceder execução apenas para usuários autenticados e service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Garantir search_path seguro em funções críticas que podem ter escapado
-- (Focando nas que apareceram como nulas ou sem config no check anterior)
ALTER FUNCTION public.registrar_venda_transacional(uuid, jsonb, numeric) SET search_path = public;
ALTER FUNCTION public.recalcular_lucro_venda(uuid, text) SET search_path = public;
ALTER FUNCTION public.refresh_dashboard_stats() SET search_path = public;
ALTER FUNCTION public.has_permission(text) SET search_path = public;

-- 4. Atualizar Views para usar security_invoker = true (PostgreSQL 15+)
-- Isso resolve os erros "Security Definer View" do linter.
ALTER VIEW public.view_estoque_consolidado SET (security_invoker = true);
ALTER VIEW public.view_dashboard_stats_global SET (security_invoker = true);
ALTER VIEW public.view_auditoria_posses SET (security_invoker = true);
ALTER VIEW public.view_posses_detalhes SET (security_invoker = true);
ALTER VIEW public.view_resumo_vendas_diario SET (security_invoker = true);
ALTER VIEW public.view_top_produtos SET (security_invoker = true);
ALTER VIEW public.view_top_clientes SET (security_invoker = true);
ALTER VIEW public.view_lucro_mensal SET (security_invoker = true);
ALTER VIEW public.view_dashboard_metrics SET (security_invoker = true);

-- 5. Reforçar RLS em tabelas de auditoria que são sensíveis
ALTER TABLE public.auditoria_movimentacoes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_recalculos_vendas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.posses_auditoria FORCE ROW LEVEL SECURITY;

-- 6. Garantir que extensões não tenham execução pública se possível (pg_trgm)
-- Nota: Algumas funções de extensão precisam de acesso, mas o linter do Supabase costuma sugerir restrição.
-- No entanto, alterar extensões pode ser arriscado. Focaremos no que é do app.
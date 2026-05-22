-- 1. Criar a View Materializada para métricas de alto desempenho
-- Usamos View Materializada para que as consultas do dashboard sejam instantâneas, sem recalcular tudo do zero toda vez.
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_stats;

CREATE MATERIALIZED VIEW public.mv_dashboard_stats AS
SELECT 
    COUNT(id) as total_vendas_count,
    COALESCE(SUM(total), 0) as receita_total,
    COALESCE(SUM(lucro), 0) as lucro_total,
    CASE 
        WHEN COUNT(id) > 0 THEN COALESCE(SUM(total), 0) / COUNT(id) 
        ELSE 0 
    END as ticket_medio,
    NOW() as ultima_atualizacao
FROM public.vendas;

-- 2. Criar índice para busca rápida (embora seja apenas uma linha, é boa prática)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats ON public.mv_dashboard_stats (ultima_atualizacao);

-- 3. Função para atualizar a view materializada de forma eficiente
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh concorrente permite que a view seja lida enquanto é atualizada (exige o índice único acima)
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_stats;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Gatilhos para disparar a atualização quando houver mudanças em vendas
DROP TRIGGER IF EXISTS tr_refresh_dashboard_stats ON public.vendas;
CREATE TRIGGER tr_refresh_dashboard_stats
AFTER INSERT OR UPDATE OR DELETE ON public.vendas
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_dashboard_stats();

-- 5. Criar View Simples para acesso fácil do Frontend (evita lidar com o refresh manual no código)
CREATE OR REPLACE VIEW public.view_dashboard_metrics AS
SELECT * FROM public.mv_dashboard_stats;

-- 6. Segurança: Garantir que apenas usuários autenticados vejam as métricas
-- Nota: RLS não se aplica diretamente a views materializadas, mas a view simples herda ou pode ser controlada.
-- Como é uma métrica agregada, restringimos via permissão na função se necessário.
GRANT SELECT ON public.mv_dashboard_stats TO authenticated;
GRANT SELECT ON public.view_dashboard_metrics TO authenticated;
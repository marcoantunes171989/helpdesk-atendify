-- 1. Consolidated inventory view (Stock + Possession)
CREATE OR REPLACE VIEW public.view_estoque_consolidado AS
SELECT 
    p.id AS produto_id,
    p.codigo,
    p.descricao,
    p.valor_venda,
    p.valor_custo,
    p.estoque AS estoque_disponivel,
    COALESCE(SUM(CASE WHEN pos.status = 'em_posse' THEN pos.quantidade ELSE 0 END), 0) AS quantidade_em_posse,
    p.estoque + COALESCE(SUM(CASE WHEN pos.status = 'em_posse' THEN pos.quantidade ELSE 0 END), 0) AS estoque_total_fisico
FROM public.produtos p
LEFT JOIN public.posses pos ON p.id = pos.produto_id
GROUP BY p.id, p.codigo, p.descricao, p.valor_venda, p.valor_custo, p.estoque;

-- 2. Global business metrics view
CREATE OR REPLACE VIEW public.view_dashboard_stats_global AS
SELECT 
    (SELECT COUNT(*) FROM public.vendas) AS total_pedidos,
    (SELECT COALESCE(SUM(total), 0) FROM public.vendas) AS receita_total,
    (SELECT COALESCE(SUM(lucro), 0) FROM public.vendas) AS lucro_total,
    (SELECT COUNT(*) FROM public.clientes) AS total_clientes,
    (SELECT COALESCE(SUM(quantidade), 0) FROM public.posses WHERE status = 'em_posse') AS itens_em_posse,
    (SELECT COALESCE(SUM(estoque), 0) FROM public.produtos) AS itens_em_estoque
FROM (SELECT 1) AS dummy;

-- Grant permissions
GRANT SELECT ON public.view_estoque_consolidado TO authenticated;
GRANT SELECT ON public.view_dashboard_stats_global TO authenticated;
GRANT SELECT ON public.view_estoque_consolidado TO service_role;
GRANT SELECT ON public.view_dashboard_stats_global TO service_role;

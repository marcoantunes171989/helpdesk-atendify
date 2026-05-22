-- 1. View for daily sales and profit totals
CREATE OR REPLACE VIEW public.view_resumo_vendas_diario AS
SELECT 
    data::date AS data_referencia,
    COUNT(id) AS total_vendas,
    SUM(total) AS volume_vendas,
    SUM(lucro) AS lucro_total
FROM public.vendas
GROUP BY data::date
ORDER BY data_referencia DESC;

-- 2. View for best-selling products
CREATE OR REPLACE VIEW public.view_top_produtos AS
SELECT 
    p.id AS produto_id,
    p.descricao,
    p.codigo,
    SUM(iv.quantidade) AS total_vendido,
    SUM(iv.quantidade * iv.valor_unitario) AS receita_total
FROM public.itens_venda iv
JOIN public.produtos p ON iv.produto_id = p.id
GROUP BY p.id, p.descricao, p.codigo
ORDER BY total_vendido DESC;

-- 3. View for top customers
CREATE OR REPLACE VIEW public.view_top_clientes AS
SELECT 
    c.id AS cliente_id,
    c.nome,
    COUNT(v.id) AS total_pedidos,
    SUM(v.total) AS total_gasto
FROM public.vendas v
JOIN public.clientes c ON v.cliente_id = c.id
GROUP BY c.id, c.nome
ORDER BY total_gasto DESC;

-- 4. View for monthly profit analysis
CREATE OR REPLACE VIEW public.view_lucro_mensal AS
SELECT 
    TO_CHAR(data, 'YYYY-MM') AS mes_referencia,
    SUM(total) AS faturamento,
    SUM(lucro) AS lucro_liquido
FROM public.vendas
GROUP BY TO_CHAR(data, 'YYYY-MM')
ORDER BY mes_referencia DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON public.view_resumo_vendas_diario TO authenticated;
GRANT SELECT ON public.view_top_produtos TO authenticated;
GRANT SELECT ON public.view_top_clientes TO authenticated;
GRANT SELECT ON public.view_lucro_mensal TO authenticated;

GRANT SELECT ON public.view_resumo_vendas_diario TO service_role;
GRANT SELECT ON public.view_top_produtos TO service_role;
GRANT SELECT ON public.view_top_clientes TO service_role;
GRANT SELECT ON public.view_lucro_mensal TO service_role;

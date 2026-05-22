-- View consolidada para métricas do Dashboard e Relatórios
CREATE OR REPLACE VIEW public.view_metricas_vendas_consolidada AS
SELECT 
    v.data::DATE as data_venda,
    COUNT(DISTINCT v.id) as total_pedidos,
    SUM(v.total) as total_vendas,
    SUM(v.lucro) as total_lucro,
    CASE 
        WHEN COUNT(DISTINCT v.id) > 0 THEN SUM(v.total) / COUNT(DISTINCT v.id)
        ELSE 0 
    END as ticket_medio,
    SUM((SELECT SUM(quantidade) FROM public.itens_venda WHERE venda_id = v.id)) as total_itens_vendidos
FROM public.vendas v
WHERE v.status != 'cancelado' OR v.status IS NULL
GROUP BY v.data::DATE;

-- Garantir permissões de leitura para usuários autenticados
GRANT SELECT ON public.view_metricas_vendas_consolidada TO authenticated;

-- Comentário para documentação no Supabase
COMMENT ON VIEW public.view_metricas_vendas_consolidada IS 'View consolidada para cálculo de ticket médio, lucro e volume de vendas por dia.';
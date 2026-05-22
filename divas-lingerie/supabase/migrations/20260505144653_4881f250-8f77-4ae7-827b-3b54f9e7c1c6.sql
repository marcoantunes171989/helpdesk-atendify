-- 1. View de Resumo Diário
CREATE OR REPLACE VIEW public.view_resumo_vendas_diario AS
SELECT 
    (v.created_at AT TIME ZONE 'UTC')::date as data_referencia,
    COUNT(v.id) as total_vendas,
    SUM(v.ven_valor_total) as volume_vendas,
    SUM(v.ven_valor_total - COALESCE(
        (SELECT SUM(p.pro_valor_compra * iv.itv_quantidade) 
         FROM public.tab_itens_venda iv 
         JOIN public.tab_produtos p ON iv.itv_produto_id = p.id 
         WHERE iv.itv_venda_id = v.id), 0
    )) as lucro_total
FROM public.tab_vendas v
GROUP BY 1;

-- 2. View de Formas de Pagamento
CREATE OR REPLACE VIEW public.view_formas_pagamento_stats AS
SELECT 
    ven_forma_pagamento as forma_pagamento,
    COUNT(id) as total_vendas,
    SUM(ven_valor_total) as volume_financeiro
FROM public.tab_vendas
GROUP BY 1;

-- 3. View de Top Produtos
CREATE OR REPLACE VIEW public.view_top_produtos AS
SELECT 
    p.id as produto_id,
    p.pro_descricao as descricao,
    SUM(iv.itv_quantidade) as total_vendido,
    SUM(iv.itv_valor_total) as receita_total
FROM public.tab_itens_venda iv
JOIN public.tab_produtos p ON iv.itv_produto_id = p.id
GROUP BY 1, 2
ORDER BY 3 DESC;

-- Permissões
GRANT SELECT ON public.view_resumo_vendas_diario TO authenticated;
GRANT SELECT ON public.view_formas_pagamento_stats TO authenticated;
GRANT SELECT ON public.view_top_produtos TO authenticated;

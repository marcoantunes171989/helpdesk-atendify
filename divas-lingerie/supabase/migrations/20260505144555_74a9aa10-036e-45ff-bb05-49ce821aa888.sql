-- Criar a view de auditoria detalhada que a tela espera
CREATE OR REPLACE VIEW public.view_auditoria_detalhada AS
SELECT 
    v.id,
    v.created_at,
    u.usu_nome as usuario_nome,
    u.id as usuario_id,
    c.cli_nome as cliente_nome,
    c.id as cliente_id,
    p.pro_descricao as produto_descricao,
    p.id as produto_id,
    p.pro_codigo as produto_codigo,
    iv.itv_quantidade as quantidade,
    'venda'::text as tipo_movimentacao,
    'Venda realizada via PDV'::text as observacao,
    iv.itv_valor_total as valor_total,
    v.id as venda_id
FROM public.tab_vendas v
JOIN public.tab_itens_venda iv ON v.id = iv.itv_venda_id
JOIN public.tab_produtos p ON iv.itv_produto_id = p.id
LEFT JOIN public.tab_usuarios u ON v.ven_usuario_id = u.id
LEFT JOIN public.tab_clientes c ON v.ven_cliente_id = c.id;

-- Garantir acesso à view
GRANT SELECT ON public.view_auditoria_detalhada TO authenticated;
GRANT SELECT ON public.view_auditoria_detalhada TO service_role;

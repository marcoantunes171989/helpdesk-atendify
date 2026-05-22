CREATE OR REPLACE VIEW public.view_auditoria_detalhada AS
SELECT 
    ae.id,
    ae.created_at,
    ae.tipo_movimentacao,
    ae.quantidade_alterada,
    ae.estoque_anterior,
    ae.estoque_atual,
    ae.observacao,
    ae.usuario_id,
    p.descricao as produto_descricao,
    p.codigo as produto_codigo,
    perf.nome as usuario_nome,
    perf.email as usuario_email,
    v.id as venda_id,
    c.nome as cliente_nome,
    ae.posse_id
FROM public.auditoria_estoque ae
LEFT JOIN public.produtos p ON ae.produto_id = p.id
LEFT JOIN public.perfis perf ON ae.usuario_id = perf.id
LEFT JOIN public.vendas v ON ae.venda_id = v.id
LEFT JOIN public.clientes c ON v.cliente_id = c.id
ORDER BY ae.created_at DESC;

GRANT SELECT ON public.view_auditoria_detalhada TO authenticated;
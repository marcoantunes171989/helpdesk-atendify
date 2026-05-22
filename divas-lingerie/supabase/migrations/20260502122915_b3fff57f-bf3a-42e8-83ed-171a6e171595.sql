CREATE OR REPLACE VIEW public.view_auditoria_posses AS
SELECT 
    pa.id,
    pa.posse_id,
    pa.quantidade,
    pa.status_anterior,
    pa.status_novo,
    pa.dados_anteriores,
    pa.dados_novos,
    pa.criado_at,
    p.nome as usuario_nome,
    c.nome as cliente_nome,
    prod.descricao as produto_nome,
    prod.codigo as produto_codigo
FROM 
    public.posses_auditoria pa
LEFT JOIN 
    public.perfis p ON pa.usuario_id = p.id
LEFT JOIN 
    public.clientes c ON pa.cliente_id = c.id
LEFT JOIN 
    public.produtos prod ON pa.produto_id = prod.id;

-- Ensure it's accessible (considering it's an audit view, maybe only admins, but for now let's keep it simple)
ALTER VIEW public.view_auditoria_posses SET (security_invoker = on);

-- 1. Create a view for efficient searching
CREATE OR REPLACE VIEW public.view_posses_detalhes AS
SELECT 
    p.*,
    c.nome AS cliente_nome,
    pr.descricao AS produto_descricao,
    pr.codigo AS produto_codigo
FROM public.posses p
LEFT JOIN public.clientes c ON p.cliente_id = c.id
LEFT JOIN public.produtos pr ON p.produto_id = pr.id;

-- 2. Grant access to authenticated users
GRANT SELECT ON public.view_posses_detalhes TO authenticated;
GRANT SELECT ON public.view_posses_detalhes TO service_role;

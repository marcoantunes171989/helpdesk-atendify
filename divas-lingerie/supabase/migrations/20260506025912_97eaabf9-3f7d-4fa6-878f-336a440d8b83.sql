-- Drop dependent view first
DROP VIEW IF EXISTS public.view_visitas_detalhada;

-- Rename existing date column
ALTER TABLE public.tab_visitas RENAME COLUMN vis_data TO vis_data_prevista;

-- Add real visit date column
ALTER TABLE public.tab_visitas ADD COLUMN vis_data_real DATE;

-- Create the view with all information including colors
CREATE OR REPLACE VIEW public.view_visitas_detalhada AS
SELECT 
    v.id,
    v.vis_data_prevista,
    v.vis_data_real,
    v.vis_observacoes,
    v.created_at,
    c.id as cliente_id,
    c.cli_nome as cliente_nome,
    c.cli_cidade as cliente_cidade,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', p.id, 
                'descricao', p.pro_descricao,
                'cor', co.cor_nome
            )
        )
        FROM public.tab_produtos p
        LEFT JOIN public.tab_cores co ON p.pro_cor_id = co.id
        WHERE p.id = ANY(v.vis_produtos_ids)
    ) as produtos_detalhes
FROM 
    public.tab_visitas v
JOIN 
    public.tab_clientes c ON v.vis_cliente_id = c.id;

-- Grant permissions to the view
GRANT SELECT ON public.view_visitas_detalhada TO authenticated;

-- Ensure FK integrity and performance for tab_visitas
-- (The table was already created with FK to tab_clientes, let's add more robustness)

-- 1. Create a function to audit visits changes
CREATE OR REPLACE FUNCTION public.audit_visitas_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, acao, dados_anteriores, dados_novos)
        VALUES ('tab_visitas', NEW.id, 'INSERT', NULL, to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, acao, dados_anteriores, dados_novos)
        VALUES ('tab_visitas', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, acao, dados_anteriores, dados_novos)
        VALUES ('tab_visitas', OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the audit trigger
DROP TRIGGER IF EXISTS trg_audit_visitas ON public.tab_visitas;
CREATE TRIGGER trg_audit_visitas
AFTER INSERT OR UPDATE OR DELETE ON public.tab_visitas
FOR EACH ROW EXECUTE FUNCTION public.audit_visitas_changes();

-- 3. Add a check to ensure vis_produtos_ids only contains valid UUIDs (handled by array type, but let's ensure indices)
-- Gin index for the array of products to allow fast searches like "visits that demonstrated product X"
CREATE INDEX IF NOT EXISTS idx_visitas_produtos_ids ON public.tab_visitas USING GIN (vis_produtos_ids);

-- 4. Create a view for detailed visits to simplify frontend queries and improve performance
CREATE OR REPLACE VIEW public.view_visitas_detalhada AS
SELECT 
    v.id,
    v.vis_data,
    v.vis_observacoes,
    v.created_at,
    c.id as cliente_id,
    c.cli_nome as cliente_nome,
    c.cli_cidade as cliente_cidade,
    (
        SELECT jsonb_agg(jsonb_build_object('id', p.id, 'descricao', pro_descricao))
        FROM public.tab_produtos p
        WHERE p.id = ANY(v.vis_produtos_ids)
    ) as produtos_detalhes
FROM 
    public.tab_visitas v
JOIN 
    public.tab_clientes c ON v.vis_cliente_id = c.id;

-- Grant permissions to the view
GRANT SELECT ON public.view_visitas_detalhada TO authenticated;

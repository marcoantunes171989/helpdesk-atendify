-- Dropar a view que depende da coluna
DROP VIEW IF EXISTS public.view_visitas_detalhada;

-- Garantir que não existam registros órfãos
DELETE FROM public.tab_visitas 
WHERE vis_cliente_id NOT IN (SELECT id FROM public.tab_clientes);

-- Adicionar FK para clientes (se ainda não existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_visitas_cliente') THEN
        ALTER TABLE public.tab_visitas
        ADD CONSTRAINT fk_visitas_cliente
        FOREIGN KEY (vis_cliente_id) 
        REFERENCES public.tab_clientes(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Alterar o tipo da coluna
ALTER TABLE public.tab_visitas 
ALTER COLUMN vis_produtos_ids TYPE uuid[] USING vis_produtos_ids::uuid[];

-- Recriar a view
CREATE OR REPLACE VIEW public.view_visitas_detalhada AS
 SELECT v.id,
    v.vis_data_prevista,
    v.vis_data_real,
    v.vis_observacoes,
    v.created_at,
    c.id AS cliente_id,
    c.cli_nome AS cliente_nome,
    c.cli_cidade AS cliente_cidade,
    ( SELECT jsonb_agg(jsonb_build_object('id', p.id, 'descricao', p.pro_descricao, 'cor', co.cor_nome)) AS jsonb_agg
           FROM (tab_produtos p
             LEFT JOIN tab_cores co ON ((p.pro_cor_id = co.id)))
          WHERE (p.id = ANY (v.vis_produtos_ids))) AS produtos_detalhes
   FROM (tab_visitas v
     JOIN tab_clientes c ON ((v.vis_cliente_id = c.id)));

-- Criar função para validar se os produtos existem
CREATE OR REPLACE FUNCTION public.validate_visita_produtos()
RETURNS TRIGGER AS $$
DECLARE
    p_id uuid;
BEGIN
    IF NEW.vis_produtos_ids IS NOT NULL THEN
        FOREACH p_id IN ARRAY NEW.vis_produtos_ids
        LOOP
            IF NOT EXISTS (SELECT 1 FROM public.tab_produtos WHERE id = p_id) THEN
                RAISE EXCEPTION 'Produto com ID % não existe', p_id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger de validação
DROP TRIGGER IF EXISTS tr_validate_visita_produtos ON public.tab_visitas;
CREATE TRIGGER tr_validate_visita_produtos
BEFORE INSERT OR UPDATE ON public.tab_visitas
FOR EACH ROW EXECUTE FUNCTION public.validate_visita_produtos();
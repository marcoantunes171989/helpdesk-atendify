-- Garantir que RLS está habilitado
ALTER TABLE public.tab_visitas ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "Authenticated users can view visits" ON public.tab_visitas;
DROP POLICY IF EXISTS "Authenticated users can insert visits" ON public.tab_visitas;
DROP POLICY IF EXISTS "Authenticated users can update visits" ON public.tab_visitas;
DROP POLICY IF EXISTS "Authenticated users can delete visits" ON public.tab_visitas;

-- Criar novas políticas robustas para usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON public.tab_visitas FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados" 
ON public.tab_visitas FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados" 
ON public.tab_visitas FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir exclusão para usuários autenticados" 
ON public.tab_visitas FOR DELETE 
TO authenticated 
USING (true);

-- Ajustar a função de validação para incluir search_path (correção de segurança do linter)
CREATE OR REPLACE FUNCTION public.validate_visita_produtos()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;
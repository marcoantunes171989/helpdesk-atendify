-- Reforçar permissões na tabela de auditoria
GRANT INSERT, SELECT ON public.tab_auditoria TO authenticated;
GRANT INSERT, SELECT ON public.tab_auditoria TO service_role;

-- Garantir que a função de auditoria rode corretamente
CREATE OR REPLACE FUNCTION public.fn_auditoria_clientes()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    -- Obter o ID do usuário de forma segura
    v_usuario_id := auth.uid();

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, usuario_id, dados_novos)
        VALUES ('tab_clientes', NEW.id, 'INSERT', v_usuario_id, row_to_json(NEW)::jsonb);
        
        NEW.created_by := v_usuario_id;
        NEW.updated_by := v_usuario_id;
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, usuario_id, dados_antigos, dados_novos)
        VALUES ('tab_clientes', OLD.id, 'UPDATE', v_usuario_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        
        NEW.updated_by := v_usuario_id;
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, usuario_id, dados_antigos)
        VALUES ('tab_clientes', OLD.id, 'DELETE', v_usuario_id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir políticas de RLS para tab_auditoria
DROP POLICY IF EXISTS "Permitir inserção para autenticados auditoria" ON public.tab_auditoria;
DROP POLICY IF EXISTS "Usuários autenticados podem ver auditoria" ON public.tab_auditoria;

CREATE POLICY "Enable insert for authenticated users" ON public.tab_auditoria FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable select for authenticated users" ON public.tab_auditoria FOR SELECT USING (auth.role() = 'authenticated');

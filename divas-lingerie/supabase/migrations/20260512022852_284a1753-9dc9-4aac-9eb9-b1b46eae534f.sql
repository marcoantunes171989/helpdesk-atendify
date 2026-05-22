-- Check if the trigger function exists, if not create it
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get current user ID from auth.uid()
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, usuario_id, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, v_user_id, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, usuario_id, dados_antigos, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, TG_OP, v_user_id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, usuario_id, dados_antigos)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, TG_OP, v_user_id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists and create trigger for tab_cargos
DROP TRIGGER IF EXISTS audit_tab_cargos ON public.tab_cargos;
CREATE TRIGGER audit_tab_cargos
AFTER INSERT OR UPDATE OR DELETE ON public.tab_cargos
FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

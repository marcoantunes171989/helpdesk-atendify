CREATE OR REPLACE FUNCTION public.audit_visitas_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, dados_antigos, dados_novos)
        VALUES ('tab_visitas', NEW.id, 'INSERT', NULL, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, dados_antigos, dados_novos)
        VALUES ('tab_visitas', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.tab_auditoria (tabela_nome, registro_id, operacao, dados_antigos, dados_novos)
        VALUES ('tab_visitas', OLD.id, 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;
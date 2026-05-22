-- Ajustar a função de gatilho para usar SECURITY DEFINER e search_path correto
-- Isso garante que ela rode com as permissões do criador (bypassando RLS se necessário na tabela de auditoria)
CREATE OR REPLACE FUNCTION public.fn_auditoria_clientes()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    -- Tenta capturar o ID do usuário do Supabase
    BEGIN
        v_usuario_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

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

-- Garantir que o RLS está habilitado
ALTER TABLE public.tab_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_auditoria ENABLE ROW LEVEL SECURITY;

-- Resetar e recriar políticas para tab_clientes
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.tab_clientes;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.tab_clientes;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.tab_clientes;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.tab_clientes;

CREATE POLICY "Permitir inserção para autenticados" ON public.tab_clientes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir leitura para autenticados" ON public.tab_clientes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir atualização para autenticados" ON public.tab_clientes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir exclusão para autenticados" ON public.tab_clientes FOR DELETE USING (auth.role() = 'authenticated');

-- Resetar e recriar políticas para tab_auditoria
DROP POLICY IF EXISTS "Permitir inserção na auditoria por usuários autenticados" ON public.tab_auditoria;
DROP POLICY IF EXISTS "Usuários autenticados podem ver auditoria" ON public.tab_auditoria;

-- A função de auditoria agora é SECURITY DEFINER, então ela não depende do RLS do usuário para inserir,
-- mas é bom ter uma política clara para o app também.
CREATE POLICY "Permitir inserção para autenticados auditoria" ON public.tab_auditoria FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Permitir leitura para autenticados auditoria" ON public.tab_auditoria FOR SELECT USING (auth.role() = 'authenticated');

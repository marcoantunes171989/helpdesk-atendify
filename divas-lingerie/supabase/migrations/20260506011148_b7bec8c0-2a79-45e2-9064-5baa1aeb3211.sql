-- 1. Adicionar colunas de auditoria na tabela de clientes
ALTER TABLE public.tab_clientes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 2. Criar tabela de auditoria se não existir (baseado no histórico de arquivos, parece que auditoria é um requisito comum)
CREATE TABLE IF NOT EXISTS public.tab_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela_nome TEXT NOT NULL,
    registro_id UUID NOT NULL,
    operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    usuario_id UUID REFERENCES auth.users(id),
    dados_antigos JSONB,
    dados_novos JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.tab_auditoria ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem ver os logs (ajuste conforme necessário)
CREATE POLICY "Usuários autenticados podem ver auditoria" 
ON public.tab_auditoria FOR SELECT TO authenticated USING (true);

-- 3. Criar função de gatilho para auditoria
CREATE OR REPLACE FUNCTION public.fn_auditoria_clientes()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
BEGIN
    -- Obter o ID do usuário atual do contexto da sessão do Supabase
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Criar o gatilho na tabela de clientes
DROP TRIGGER IF EXISTS trg_auditoria_clientes ON public.tab_clientes;
CREATE TRIGGER trg_auditoria_clientes
BEFORE INSERT OR UPDATE OR DELETE ON public.tab_clientes
FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_clientes();

-- 1. Criar tabela de histórico de posses se não existir
CREATE TABLE IF NOT EXISTS public.historico_posses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posse_id UUID REFERENCES public.posses(id) ON DELETE CASCADE,
    status_anterior TEXT,
    status_novo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacao TEXT
);

-- 2. Habilitar RLS
ALTER TABLE public.historico_posses ENABLE ROW LEVEL SECURITY;

-- 3. Criar política de leitura (se não existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Usuários autenticados podem ver histórico de posses') THEN
        CREATE POLICY "Usuários autenticados podem ver histórico de posses" 
        ON public.historico_posses FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 4. Gatilho para registrar mudanças
CREATE OR REPLACE FUNCTION public.fn_registrar_historico_posse()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.historico_posses (posse_id, status_novo, usuario_id, observacao)
        VALUES (NEW.id, NEW.status, auth.uid(), 'Criação do registro de consignação');
    ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.historico_posses (posse_id, status_anterior, status_novo, usuario_id, observacao)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Alteração de status');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_registrar_historico_posse ON public.posses;
CREATE TRIGGER tr_registrar_historico_posse
AFTER INSERT OR UPDATE ON public.posses
FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_historico_posse();

-- 5. View corrigida (usando perfis.id que é o UUID do usuário)
CREATE OR REPLACE VIEW public.view_historico_posses_detalhes AS
SELECT 
    hp.*,
    p.email as usuario_email,
    p.nome as usuario_nome
FROM public.historico_posses hp
LEFT JOIN public.perfis p ON hp.usuario_id = p.id;

GRANT SELECT ON public.view_historico_posses_detalhes TO authenticated;
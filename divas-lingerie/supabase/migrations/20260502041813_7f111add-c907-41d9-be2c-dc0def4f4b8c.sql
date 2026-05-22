-- Criar tabela de visitas
CREATE TABLE public.visitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    data DATE DEFAULT CURRENT_DATE,
    produtos_demonstrados UUID[] DEFAULT '{}',
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.visitas FOR ALL USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_visitas BEFORE UPDATE ON public.visitas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Índice para busca rápida
CREATE INDEX idx_visitas_cliente_id ON public.visitas (cliente_id);
CREATE INDEX idx_visitas_data ON public.visitas (data DESC);
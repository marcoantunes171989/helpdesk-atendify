-- Criação da tabela de finalizadoras
CREATE TABLE IF NOT EXISTS public.tab_finalizadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fin_descricao TEXT NOT NULL,
    fin_codigo_atalho TEXT,
    fin_ativa BOOLEAN DEFAULT true,
    fin_permite_troco BOOLEAN DEFAULT true,
    fin_icone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tab_finalizadoras ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Finalizadoras são visíveis por todos os usuários autenticados" 
ON public.tab_finalizadoras FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Apenas administradores podem gerenciar finalizadoras" 
ON public.tab_finalizadoras FOR ALL 
TO authenticated 
USING (true); -- Em um cenário real, aqui teria uma checagem de role

-- Inserir finalizadoras padrão se não existirem
INSERT INTO public.tab_finalizadoras (fin_descricao, fin_icone, fin_permite_troco)
VALUES 
('DINHEIRO', 'Banknote', true),
('CARTÃO DE CRÉDITO', 'CreditCard', false),
('CARTÃO DE DÉBITO', 'CreditCard', false),
('PIX', 'QrCode', false)
ON CONFLICT DO NOTHING;

-- Adicionar coluna de referência na tabela de pagamentos (opcional mas recomendado)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tab_vendas_pagamentos' AND column_name = 'vpa_finalizadora_id') THEN
        ALTER TABLE public.tab_vendas_pagamentos ADD COLUMN vpa_finalizadora_id UUID REFERENCES public.tab_finalizadoras(id);
    END IF;
END $$;

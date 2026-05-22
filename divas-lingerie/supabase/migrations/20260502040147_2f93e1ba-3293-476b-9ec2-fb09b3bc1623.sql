-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categorias
CREATE TABLE public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Produtos
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    referencia TEXT,
    codigo_barras TEXT,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    valor_custo DECIMAL(10,2) DEFAULT 0,
    valor_venda DECIMAL(10,2) DEFAULT 0,
    estoque INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clientes
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    telefone TEXT,
    cidade TEXT,
    endereco TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Vendas
CREATE TABLE public.vendas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    total DECIMAL(10,2) DEFAULT 0,
    lucro DECIMAL(10,2) DEFAULT 0,
    data DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Itens de Venda
CREATE TABLE public.itens_venda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Posses (Consignação)
CREATE TYPE public.status_posse AS ENUM ('em_posse', 'vendido', 'devolvido');

CREATE TABLE public.posses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    quantidade INTEGER NOT NULL,
    data_saida DATE DEFAULT CURRENT_DATE,
    previsao_devolucao DATE,
    status status_posse DEFAULT 'em_posse',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Cargos
CREATE TABLE public.cargos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    permissoes TEXT[] DEFAULT '{}',
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Perfis de Usuários (Profiles)
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ativo',
    ultimo_acesso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Criar políticas básicas de acesso (ajustar conforme necessidade)
-- Permitir que usuários autenticados vejam e manipulem os dados
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.categorias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.produtos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.vendas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.itens_venda FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.posses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.cargos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.perfis FOR ALL USING (auth.role() = 'authenticated');

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gatilhos para updated_at
CREATE TRIGGER set_updated_at_categorias BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_produtos BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_clientes BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_posses BEFORE UPDATE ON public.posses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_cargos BEFORE UPDATE ON public.cargos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_perfis BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
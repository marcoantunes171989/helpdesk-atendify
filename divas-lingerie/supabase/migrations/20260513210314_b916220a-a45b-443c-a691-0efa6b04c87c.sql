-- Create tab_categorias if it doesn't exist (it seems it already exists but let's ensure structure)
-- The user asked to "save information in the database, consist all information according to the table"
-- I will ensure all required tables exist and have consistent naming/types.

-- Tab Categorias
CREATE TABLE IF NOT EXISTS public.tab_categorias (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cat_nome TEXT NOT NULL,
    cat_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_categorias ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tab_categorias' AND policyname = 'Permitir acesso total para todos os usuários') THEN
        CREATE POLICY "Permitir acesso total para todos os usuários" ON public.tab_categorias FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Tab Tamanhos
CREATE TABLE IF NOT EXISTS public.tab_tamanhos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tam_nome TEXT NOT NULL,
    tam_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_tamanhos ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tab_tamanhos' AND policyname = 'Permitir acesso total para todos os usuários') THEN
        CREATE POLICY "Permitir acesso total para todos os usuários" ON public.tab_tamanhos FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Tab Cores
CREATE TABLE IF NOT EXISTS public.tab_cores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cor_nome TEXT NOT NULL,
    cor_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_cores ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tab_cores' AND policyname = 'Permitir acesso total para todos os usuários') THEN
        CREATE POLICY "Permitir acesso total para todos os usuários" ON public.tab_cores FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Tab Clientes
CREATE TABLE IF NOT EXISTS public.tab_clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cli_nome TEXT NOT NULL,
    cli_documento TEXT,
    cli_email TEXT,
    cli_telefone TEXT,
    cli_cidade TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_clientes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tab_clientes' AND policyname = 'Permitir acesso total para todos os usuários') THEN
        CREATE POLICY "Permitir acesso total para todos os usuários" ON public.tab_clientes FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Tab Fornecedores
CREATE TABLE IF NOT EXISTS public.tab_fornecedores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    for_documento TEXT,
    for_razao_social TEXT NOT NULL,
    for_fantasia TEXT,
    for_endereco TEXT,
    for_numero TEXT,
    for_bairro TEXT,
    for_cidade TEXT,
    for_estado TEXT,
    for_cep TEXT,
    for_observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_fornecedores ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tab_fornecedores' AND policyname = 'Permitir acesso total para todos os usuários') THEN
        CREATE POLICY "Permitir acesso total para todos os usuários" ON public.tab_fornecedores FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Tab Finalizadoras
CREATE TABLE IF NOT EXISTS public.tab_finalizadoras (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fin_descricao TEXT NOT NULL,
    fin_ativa BOOLEAN DEFAULT true,
    fin_icone TEXT,
    fin_permite_troco BOOLEAN DEFAULT true,
    fin_codigo_atalho TEXT,
    fin_ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tab_finalizadoras ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tab_finalizadoras' AND policyname = 'Permitir acesso total para todos os usuários') THEN
        CREATE POLICY "Permitir acesso total para todos os usuários" ON public.tab_finalizadoras FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

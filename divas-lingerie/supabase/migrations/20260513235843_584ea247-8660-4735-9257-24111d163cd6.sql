-- Create suppliers table
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

-- Enable RLS
ALTER TABLE public.tab_fornecedores ENABLE ROW LEVEL SECURITY;

-- Create public access policies
CREATE POLICY "Allow public select" ON public.tab_fornecedores FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.tab_fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.tab_fornecedores FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.tab_fornecedores FOR DELETE USING (true);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tab_fornecedores_updated_at') THEN
        CREATE TRIGGER update_tab_fornecedores_updated_at
        BEFORE UPDATE ON public.tab_fornecedores
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
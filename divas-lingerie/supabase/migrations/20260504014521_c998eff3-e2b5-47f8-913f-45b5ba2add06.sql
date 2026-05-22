-- Create updated_at function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add missing columns to clientes table
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS documento TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS estado TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT;

-- Ensure RLS is enabled
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Recreate or ensure policies exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Permitir leitura para usuários autenticados') THEN
        CREATE POLICY "Permitir leitura para usuários autenticados" ON public.clientes FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Permitir inserção para usuários autenticados') THEN
        CREATE POLICY "Permitir inserção para usuários autenticados" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Permitir atualização para usuários autenticados') THEN
        CREATE POLICY "Permitir atualização para usuários autenticados" ON public.clientes FOR UPDATE TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clientes' AND policyname = 'Permitir exclusão para usuários autenticados') THEN
        CREATE POLICY "Permitir exclusão para usuários autenticados" ON public.clientes FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

-- Ensure trigger exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clientes_updated_at') THEN
        CREATE TRIGGER update_clientes_updated_at
        BEFORE UPDATE ON public.clientes
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
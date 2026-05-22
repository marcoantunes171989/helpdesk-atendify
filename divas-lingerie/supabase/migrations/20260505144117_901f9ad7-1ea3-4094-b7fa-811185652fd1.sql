-- Dropping existing tables to recreate with new pattern
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.perfis CASCADE;

-- Create table for clients
CREATE TABLE public.tab_clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cli_nome TEXT NOT NULL,
    cli_documento TEXT UNIQUE,
    cli_email TEXT,
    cli_telefone TEXT,
    cli_endereco TEXT,
    cli_cidade TEXT,
    cli_estado TEXT,
    cli_cep TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for clients
ALTER TABLE public.tab_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total para usuários autenticados em clientes"
ON public.tab_clientes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create table for users (profiles)
CREATE TABLE public.tab_usuarios (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    usu_nome TEXT NOT NULL,
    usu_email TEXT,
    usu_cargo TEXT,
    usu_avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for users
ALTER TABLE public.tab_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver todos os perfis"
ON public.tab_usuarios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.tab_usuarios FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tab_usuarios (id, usu_nome, usu_email, usu_avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email), new.email, new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_tab_clientes_updated_at BEFORE UPDATE ON public.tab_clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tab_usuarios_updated_at BEFORE UPDATE ON public.tab_usuarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for roles (cargos)
CREATE TABLE public.tab_cargos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    permissoes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tab_cargos ENABLE ROW LEVEL SECURITY;

-- Policies for tab_cargos
CREATE POLICY "Cargos are viewable by everyone" 
ON public.tab_cargos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage cargos" 
ON public.tab_cargos FOR ALL USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_tab_cargos_updated_at
BEFORE UPDATE ON public.tab_cargos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add usu_cargo_id column to tab_usuarios
ALTER TABLE public.tab_usuarios 
ADD COLUMN usu_cargo_id UUID REFERENCES public.tab_cargos(id);

-- Insert some default cargos
INSERT INTO public.tab_cargos (nome, permissoes) VALUES 
('Administrador', '["all"]'),
('Gerente', '["dashboard", "vendas", "produtos", "relatorios"]'),
('Vendedor', '["dashboard", "vendas", "clientes"]');

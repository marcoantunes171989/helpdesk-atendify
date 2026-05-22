-- Create a table for customer visits
CREATE TABLE public.tab_visitas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vis_cliente_id UUID NOT NULL REFERENCES public.tab_clientes(id),
    vis_data DATE NOT NULL DEFAULT CURRENT_DATE,
    vis_produtos_ids UUID[] DEFAULT '{}',
    vis_observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tab_visitas ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Authenticated users can view visits" 
ON public.tab_visitas 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert visits" 
ON public.tab_visitas 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update visits" 
ON public.tab_visitas 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete visits" 
ON public.tab_visitas 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tab_visitas_updated_at
BEFORE UPDATE ON public.tab_visitas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for performance
CREATE INDEX idx_visitas_cliente ON public.tab_visitas(vis_cliente_id);
CREATE INDEX idx_visitas_data ON public.tab_visitas(vis_data);

-- Create a table for consignment (sacoleira control)
CREATE TYPE public.status_consignacao AS ENUM ('em_posse', 'vendido', 'devolvido');

CREATE TABLE public.tab_consignacao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    con_cliente_id UUID NOT NULL REFERENCES public.tab_clientes(id),
    con_produto_id UUID NOT NULL REFERENCES public.tab_produtos(id),
    con_quantidade INTEGER NOT NULL CHECK (con_quantidade > 0),
    con_data_saida TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    con_status public.status_consignacao NOT NULL DEFAULT 'em_posse',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tab_consignacao ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Authenticated users can view consignations" 
ON public.tab_consignacao 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert consignations" 
ON public.tab_consignacao 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update consignations" 
ON public.tab_consignacao 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete consignations" 
ON public.tab_consignacao 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tab_consignacao_updated_at
BEFORE UPDATE ON public.tab_consignacao
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for performance
CREATE INDEX idx_consignacao_cliente ON public.tab_consignacao(con_cliente_id);
CREATE INDEX idx_consignacao_produto ON public.tab_consignacao(con_produto_id);
CREATE INDEX idx_consignacao_status ON public.tab_consignacao(con_status);

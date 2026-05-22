-- Create a table for product sizes
CREATE TABLE public.tab_tamanhos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tam_nome TEXT NOT NULL,
    tam_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tab_tamanhos ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Users can view sizes" 
ON public.tab_tamanhos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert sizes" 
ON public.tab_tamanhos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update sizes" 
ON public.tab_tamanhos 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Users can delete sizes" 
ON public.tab_tamanhos 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tab_tamanhos_updated_at
BEFORE UPDATE ON public.tab_tamanhos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

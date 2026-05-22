-- Create a table for product colors
CREATE TABLE public.tab_cores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cor_nome TEXT NOT NULL,
    cor_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tab_cores ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated access
CREATE POLICY "Users can view colors" 
ON public.tab_cores 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert colors" 
ON public.tab_cores 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update colors" 
ON public.tab_cores 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Users can delete colors" 
ON public.tab_cores 
FOR DELETE 
TO authenticated
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tab_cores_updated_at
BEFORE UPDATE ON public.tab_cores
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

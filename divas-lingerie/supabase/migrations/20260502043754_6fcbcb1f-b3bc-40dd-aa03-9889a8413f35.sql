-- Create audit table for consignment status changes
CREATE TABLE IF NOT EXISTS public.posses_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posse_id UUID NOT NULL,
    cliente_id UUID,
    produto_id UUID,
    quantidade INT,
    status_anterior TEXT,
    status_novo TEXT,
    usuario_id UUID DEFAULT auth.uid(),
    criado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.posses_auditoria ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can view audit logs
CREATE POLICY "Users can view audit logs" 
ON public.posses_auditoria 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Function to handle the logging
CREATE OR REPLACE FUNCTION public.log_posses_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when status changes to 'vendido' or 'devolvido'
    IF (OLD.status = 'em_posse' AND NEW.status IN ('vendido', 'devolvido')) THEN
        INSERT INTO public.posses_auditoria (
            posse_id, 
            cliente_id, 
            produto_id, 
            quantidade, 
            status_anterior, 
            status_novo
        ) VALUES (
            OLD.id, 
            OLD.cliente_id, 
            OLD.produto_id, 
            OLD.quantidade, 
            OLD.status, 
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the logging function
CREATE OR REPLACE TRIGGER trg_log_posses_status
AFTER UPDATE ON public.posses
FOR EACH ROW
EXECUTE FUNCTION public.log_posses_status_change();

-- Grant permissions
GRANT SELECT ON public.posses_auditoria TO authenticated;
GRANT SELECT ON public.posses_auditoria TO service_role;

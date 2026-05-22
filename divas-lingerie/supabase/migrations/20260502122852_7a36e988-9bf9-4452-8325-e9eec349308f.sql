-- 1. Enhance the audit table
ALTER TABLE public.posses_auditoria 
ADD COLUMN IF NOT EXISTS dados_anteriores JSONB,
ADD COLUMN IF NOT EXISTS dados_novos JSONB;

-- 2. Update the trigger function to capture user and full state
CREATE OR REPLACE FUNCTION public.log_posses_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get the current user from auth context
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Log when status changes or when specifically requested
    -- In this case, we log all updates to 'posses' for a complete audit trail
    INSERT INTO public.posses_auditoria (
        posse_id, 
        cliente_id, 
        produto_id, 
        quantidade, 
        status_anterior, 
        status_novo,
        usuario_id,
        dados_anteriores,
        dados_novos
    ) VALUES (
        OLD.id, 
        OLD.cliente_id, 
        OLD.produto_id, 
        OLD.quantidade, 
        OLD.status, 
        NEW.status,
        v_user_id,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );
    
    RETURN NEW;
END;
$function$;

-- 3. Ensure the trigger is active for all status-related updates
-- Check if the trigger already exists and is on the right table
-- (Assuming it's already there based on earlier discovery, but let's be safe)
DROP TRIGGER IF EXISTS tr_log_posse_status ON public.posses;
CREATE TRIGGER tr_log_posse_status
AFTER UPDATE ON public.posses
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_posses_status_change();

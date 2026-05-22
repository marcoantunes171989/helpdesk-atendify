-- Create a function to validate status transitions for consignment (posses)
CREATE OR REPLACE FUNCTION public.validate_posses_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow changes if the current status is 'em_posse'
    -- 'vendido' and 'devolvido' are final states in the current business logic
    IF OLD.status IN ('vendido', 'devolvido') AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Não é permitido alterar o status de um item que já foi finalizado (Vendido ou Devolvido). Status atual: %', OLD.status;
    END IF;

    -- Optional: Ensure we can't jump from 'pendente' (if it exists) to 'vendido' without 'em_posse' 
    -- but currently we only use 'em_posse' -> 'vendido'/'devolvido'.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER trg_validate_posses_status
BEFORE UPDATE ON public.posses
FOR EACH ROW
EXECUTE FUNCTION public.validate_posses_status_transition();

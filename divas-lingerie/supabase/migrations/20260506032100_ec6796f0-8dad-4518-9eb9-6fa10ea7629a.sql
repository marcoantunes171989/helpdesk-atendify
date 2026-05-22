-- 1. Garantir o default na coluna
ALTER TABLE public.tab_visitas 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Criar função para forçar o user_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.handle_visitas_user_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- No INSERT, se o user_id for nulo ou se quisermos garantir que seja o do usuário logado
    IF (TG_OP = 'INSERT') THEN
        IF NEW.user_id IS NULL THEN
            NEW.user_id := auth.uid();
        END IF;
    -- No UPDATE, garantimos que o user_id não seja alterado ou que permaneça vinculado ao dono
    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.user_id IS NULL THEN
            NEW.user_id := OLD.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Criar o trigger
DROP TRIGGER IF EXISTS tr_handle_visitas_user_id ON public.tab_visitas;
CREATE TRIGGER tr_handle_visitas_user_id
BEFORE INSERT OR UPDATE ON public.tab_visitas
FOR EACH ROW EXECUTE FUNCTION public.handle_visitas_user_id();
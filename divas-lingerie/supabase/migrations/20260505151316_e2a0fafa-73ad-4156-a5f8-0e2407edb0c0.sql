-- Atualizando funções com search_path seguro
ALTER FUNCTION public.check_categoria_delete() SET search_path = public;
ALTER FUNCTION public.check_produto_delete() SET search_path = public;
ALTER FUNCTION public.check_cliente_delete() SET search_path = public;

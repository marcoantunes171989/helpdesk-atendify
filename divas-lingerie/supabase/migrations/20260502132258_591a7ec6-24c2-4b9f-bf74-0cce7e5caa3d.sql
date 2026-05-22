-- Atualizar funções para incluir o search_path por segurança
ALTER FUNCTION public.registrar_venda_transacional(uuid, jsonb, numeric) SET search_path = public;
ALTER FUNCTION public.marcar_posse_como_devolvida_transacional(uuid) SET search_path = public;
ALTER FUNCTION public.converter_posse_em_venda(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.handle_sale_item_stock() SET search_path = public;
ALTER FUNCTION public.handle_posse_stock() SET search_path = public;
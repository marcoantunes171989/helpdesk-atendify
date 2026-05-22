-- Ajustar a função handle_updated_at para ter um search_path fixo por segurança
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
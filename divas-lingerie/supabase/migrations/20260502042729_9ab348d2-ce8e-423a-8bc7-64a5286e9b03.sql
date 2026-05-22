-- Revoke default public execution
REVOKE ALL ON FUNCTION public.converter_posse_em_venda_transacional(UUID) FROM public;
REVOKE ALL ON FUNCTION public.converter_posse_em_venda_transacional(UUID) FROM anon;

-- Grant execution only to authenticated users
GRANT EXECUTE ON FUNCTION public.converter_posse_em_venda_transacional(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.converter_posse_em_venda_transacional(UUID) TO service_role;

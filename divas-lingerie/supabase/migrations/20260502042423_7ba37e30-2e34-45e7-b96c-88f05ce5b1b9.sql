-- Revoke default public execution
REVOKE ALL ON FUNCTION public.has_permission(TEXT) FROM public;
REVOKE ALL ON FUNCTION public.has_permission(TEXT) FROM anon;

-- Grant execution to authenticated users only
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT) TO service_role;

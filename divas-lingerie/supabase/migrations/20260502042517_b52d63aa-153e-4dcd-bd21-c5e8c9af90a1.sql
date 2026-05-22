-- Revoke default public execution for the new function
REVOKE ALL ON FUNCTION public.recalculate_venda_totals() FROM public;
REVOKE ALL ON FUNCTION public.recalculate_venda_totals() FROM anon;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.recalculate_venda_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_venda_totals() TO service_role;

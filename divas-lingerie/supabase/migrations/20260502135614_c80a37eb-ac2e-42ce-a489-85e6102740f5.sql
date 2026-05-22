-- 1. Criar função auxiliar para verificação de permissões administrativas (Helper)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica se o usuário autenticado tem um cargo com flag admin ou nome específico
  -- Adaptar conforme a estrutura real da sua tabela de perfis/cargos
  RETURN EXISTS (
    SELECT 1 FROM public.perfis p
    JOIN public.cargos c ON p.cargo_id = c.id
    WHERE p.user_id = auth.uid()
    AND (c.nome ILIKE '%admin%' OR c.nome ILIKE '%gerente%')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Corrigir função centralizada de movimentação de estoque
-- Mudando para SECURITY DEFINER com search_path fixo, mas restringindo quem pode chamar
ALTER FUNCTION public.movimentar_estoque(UUID, INTEGER, TEXT, UUID, UUID, TEXT) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.movimentar_estoque(UUID, INTEGER, TEXT, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.movimentar_estoque(UUID, INTEGER, TEXT, UUID, UUID, TEXT) TO authenticated;

-- 3. Corrigir função de Registro de Venda
ALTER FUNCTION public.registrar_venda_transacional(UUID, JSONB, NUMERIC) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.registrar_venda_transacional(UUID, JSONB, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_venda_transacional(UUID, JSONB, NUMERIC) TO authenticated;

-- 4. Corrigir função de Cancelamento de Venda
-- Esta deve ser restrita apenas a admins/gerentes
ALTER FUNCTION public.cancelar_venda_transacional(UUID) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.cancelar_venda_transacional(UUID) FROM PUBLIC;
-- Aqui usamos a lógica de permissão:
CREATE OR REPLACE FUNCTION public.cancelar_venda_transacional_segura(p_venda_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem cancelar vendas.';
  END IF;
  PERFORM public.cancelar_venda_transacional(p_venda_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Corrigir funções de consignação
ALTER FUNCTION public.marcar_posse_como_devolvida_transacional(UUID) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.marcar_posse_como_devolvida_transacional(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_posse_como_devolvida_transacional(UUID) TO authenticated;

ALTER FUNCTION public.converter_posse_em_venda(UUID, UUID) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.converter_posse_em_venda(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.converter_posse_em_venda(UUID, UUID) TO authenticated;

-- 6. Garantir que extensões não estejam no schema public (limpeza sugerida pelo linter)
-- Nota: Isso pode exigir permissões de superuser no Supabase real, mas incluímos a intenção.
-- ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
-- ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;

-- 7. Corrigir permissões em views materializadas se existirem
-- Se houver uma view_vendas_dashboard, garantir que ela use RLS da tabela base se possível
-- ou restringir o SELECT nela.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- Re-aplicar RLS garante que o GRANT acima respeite as políticas.
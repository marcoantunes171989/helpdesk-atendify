-- 1. CORREÇÃO DE FUNÇÕES SECURITY DEFINER
DO $$ 
DECLARE 
    func_record RECORD;
    v_func_identity TEXT;
BEGIN 
    FOR func_record IN 
        SELECT 
            n.nspname AS schema_name,
            p.proname AS function_name,
            p.oid AS func_oid
        FROM 
            pg_proc p
        JOIN 
            pg_namespace n ON n.oid = p.pronamespace
        WHERE 
            n.nspname = 'public' 
            AND p.prosecdef = true
    LOOP
        -- Construir a identidade da função usando o OID para evitar problemas com argumentos default
        v_func_identity := func_record.schema_name || '.' || func_record.function_name || '(' || pg_get_function_identity_arguments(func_record.func_oid) || ')';
        
        -- Revogar EXECUTE do PUBLIC
        EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || v_func_identity || ' FROM PUBLIC';
        
        -- Conceder EXECUTE para authenticated e service_role
        EXECUTE 'GRANT EXECUTE ON FUNCTION ' || v_func_identity || ' TO authenticated, service_role';
        
        -- Definir search_path para public
        EXECUTE 'ALTER FUNCTION ' || v_func_identity || ' SET search_path = public';
    END LOOP;
END $$;

-- 2. CORREÇÃO DE VIEWS SECURITY DEFINER
DO $$ 
BEGIN
    -- Verificar se a versão do Postgres suporta security_invoker (PG 15+)
    IF (SELECT current_setting('server_version_num')::int >= 150000) THEN
        ALTER VIEW public.view_auditoria_detalhada SET (security_invoker = true);
        ALTER VIEW public.view_resumo_vendas_diario SET (security_invoker = true);
        ALTER VIEW public.view_visitas_detalhada SET (security_invoker = true);
        ALTER VIEW public.view_formas_pagamento_stats SET (security_invoker = true);
        ALTER VIEW public.view_top_produtos SET (security_invoker = true);
    END IF;
END $$;

-- 3. Garantir RLS em tabelas críticas
ALTER TABLE public.tab_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_visitas ENABLE ROW LEVEL SECURITY;

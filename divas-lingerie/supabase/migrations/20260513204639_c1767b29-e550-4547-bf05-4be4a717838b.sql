-- Criar tabela de logs de manutenção
CREATE TABLE IF NOT EXISTS public.tab_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Habilitar RLS
ALTER TABLE public.tab_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Política de acesso para logs (apenas administradores podem ver)
CREATE POLICY "Admins can view maintenance logs" ON public.tab_maintenance_logs
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.tab_usuarios 
        WHERE id = auth.uid() AND (usu_cargo = 'Gerente' OR usu_cargo = 'Administrador')
    ));

-- Atualizar função de reset do banco de dados
CREATE OR REPLACE FUNCTION public.reset_database_data()
RETURNS void AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Registrar início da operação
    INSERT INTO public.tab_maintenance_logs (operation_name, status)
    VALUES ('Reset Database Data', 'started')
    RETURNING id INTO v_log_id;

    -- Tenta executar a limpeza
    BEGIN
        -- Desativar triggers de chaves estrangeiras temporariamente
        -- Usando SET LOCAL para que a alteração seja restrita a esta transação
        SET LOCAL session_replication_role = 'replica';
        
        -- Limpar tabelas operacionais mantendo a estrutura
        TRUNCATE TABLE public.tab_itens_venda CASCADE;
        TRUNCATE TABLE public.tab_vendas_pagamentos CASCADE;
        TRUNCATE TABLE public.tab_vendas CASCADE;
        TRUNCATE TABLE public.tab_consignacao CASCADE;
        TRUNCATE TABLE public.tab_visitas CASCADE;
        TRUNCATE TABLE public.tab_produtos CASCADE;
        TRUNCATE TABLE public.tab_categorias CASCADE;
        TRUNCATE TABLE public.tab_tamanhos CASCADE;
        TRUNCATE TABLE public.tab_cores CASCADE;
        TRUNCATE TABLE public.tab_clientes CASCADE;
        TRUNCATE TABLE public.tab_fornecedores CASCADE;
        TRUNCATE TABLE public.tab_auditoria CASCADE;
        TRUNCATE TABLE public.tab_log_mensagens CASCADE;

        -- O SET LOCAL session_replication_role será revertido automaticamente ao final da transação,
        -- mas reativamos explicitamente para garantir e documentar.
        SET LOCAL session_replication_role = 'origin';

        -- Registrar sucesso
        UPDATE public.tab_maintenance_logs 
        SET status = 'completed', finished_at = now()
        WHERE id = v_log_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Garantir que triggers voltem ao normal em caso de erro
        SET LOCAL session_replication_role = 'origin';
        
        -- Registrar falha
        UPDATE public.tab_maintenance_logs 
        SET status = 'failed', finished_at = now(), error_message = SQLERRM
        WHERE id = v_log_id;
        
        RAISE EXCEPTION 'Falha crítica na limpeza do sistema: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar função de cancelar todas as vendas para incluir log
CREATE OR REPLACE FUNCTION public.cancel_all_sales()
RETURNS void AS $$
DECLARE
    v_log_id UUID;
    v_count INTEGER;
BEGIN
    -- Registrar início
    INSERT INTO public.tab_maintenance_logs (operation_name, status)
    VALUES ('Cancel All Sales', 'started')
    RETURNING id INTO v_log_id;

    BEGIN
        UPDATE public.tab_vendas 
        SET ven_status = 'Cancelada' 
        WHERE ven_status != 'Cancelada';
        
        GET DIAGNOSTICS v_count = ROW_COUNT;

        -- Registrar sucesso com detalhes
        UPDATE public.tab_maintenance_logs 
        SET status = 'completed', 
            finished_at = now(),
            details = jsonb_build_object('sales_affected', v_count)
        WHERE id = v_log_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Registrar falha
        UPDATE public.tab_maintenance_logs 
        SET status = 'failed', finished_at = now(), error_message = SQLERRM
        WHERE id = v_log_id;
        
        RAISE EXCEPTION 'Erro ao cancelar vendas: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
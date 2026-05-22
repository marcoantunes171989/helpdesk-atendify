CREATE OR REPLACE FUNCTION public.reset_database_data()
RETURNS void AS $$
BEGIN
  -- Definir o papel de replicação desativa triggers de chaves estrangeiras temporariamente nesta transação
  SET session_replication_role = 'replica';
  
  -- Limpar tabelas mantendo a estrutura
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
  
  -- Restaurar o papel de origem para reativar triggers
  SET session_replication_role = 'origin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_all_sales()
RETURNS void AS $$
BEGIN
  UPDATE public.tab_vendas 
  SET ven_status = 'Cancelada' 
  WHERE ven_status != 'Cancelada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
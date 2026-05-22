-- Recriar a view sem SECURITY DEFINER (o padrão é SECURITY INVOKER quando não especificado, 
-- mas em algumas versões do Postgres/Supabase é melhor garantir que as tabelas base tenham RLS correto)
-- No Supabase, views por padrão não usam RLS das tabelas base a menos que sejam criadas com security_invoker = true

DROP VIEW IF EXISTS public.view_crm_analytics;

CREATE VIEW public.view_crm_analytics 
WITH (security_invoker = true)
AS
 WITH total_vendas AS (
         SELECT tab_vendas.ven_cliente_id,
            count(*) AS vendas_count,
            sum(tab_vendas.ven_valor_total) AS total_gasto,
            max(tab_vendas.created_at) AS ultima_compra
           FROM tab_vendas
          WHERE (tab_vendas.ven_status = 'concluida'::text)
          GROUP BY tab_vendas.ven_cliente_id
        )
 SELECT c.id AS cliente_id,
    c.cli_nome,
    c.cli_cidade,
    c.cli_telefone,
    COALESCE(v.vendas_count, (0)::bigint) AS vendas_count,
    COALESCE(v.total_gasto, (0)::numeric) AS total_gasto,
        CASE
            WHEN (COALESCE(v.vendas_count, (0)::bigint) > 0) THEN (v.total_gasto / (v.vendas_count)::numeric)
            ELSE (0)::numeric
        END AS ticket_medio,
    v.ultima_compra
   FROM (tab_clientes c
     LEFT JOIN total_vendas v ON ((c.id = v.ven_cliente_id)));

-- Garantir que as tabelas de itens e vendas tenham políticas permissivas para o dashboard se necessário
-- mas mantendo a segurança por usuário.

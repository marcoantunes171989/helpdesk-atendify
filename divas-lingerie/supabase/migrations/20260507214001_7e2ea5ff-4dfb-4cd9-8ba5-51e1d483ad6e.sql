CREATE OR REPLACE VIEW public.view_crm_analytics AS
 SELECT c.id AS cliente_id,
    c.cli_nome,
    c.cli_cidade,
    c.cli_telefone,
    count(v.id) AS vendas_count,
    COALESCE(sum(v.ven_valor_total), 0::numeric) AS total_gasto,
        CASE
            WHEN count(v.id) > 0 THEN COALESCE(sum(v.ven_valor_total), 0::numeric) / count(v.id)::numeric
            ELSE 0::numeric
        END AS ticket_medio,
    max(v.created_at) AS ultima_compra
   FROM tab_clientes c
     LEFT JOIN tab_vendas v ON c.id = v.ven_cliente_id AND v.ven_status = 'concluida'::text
  GROUP BY c.id, c.cli_nome, c.cli_cidade, c.cli_telefone;
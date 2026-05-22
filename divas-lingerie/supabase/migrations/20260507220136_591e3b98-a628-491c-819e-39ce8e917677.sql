CREATE OR REPLACE VIEW view_crm_analytics AS
WITH total_vendas AS (
    SELECT 
        ven_cliente_id,
        count(*) as vendas_count,
        sum(ven_valor_total) as total_gasto,
        max(created_at) as ultima_compra
    FROM tab_vendas
    WHERE ven_status = 'concluida'
    GROUP BY ven_cliente_id
)
SELECT 
    c.id AS cliente_id,
    c.cli_nome,
    c.cli_cidade,
    c.cli_telefone,
    COALESCE(v.vendas_count, 0) AS vendas_count,
    COALESCE(v.total_gasto, 0) AS total_gasto,
    CASE 
        WHEN COALESCE(v.vendas_count, 0) > 0 THEN v.total_gasto / v.vendas_count 
        ELSE 0 
    END AS ticket_medio,
    v.ultima_compra
FROM tab_clientes c
LEFT JOIN total_vendas v ON c.id = v.ven_cliente_id;

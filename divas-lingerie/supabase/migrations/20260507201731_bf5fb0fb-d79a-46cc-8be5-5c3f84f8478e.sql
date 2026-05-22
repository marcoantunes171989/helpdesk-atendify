-- Criação da View para análise de CRM
CREATE OR REPLACE VIEW public.view_crm_analytics AS
SELECT 
    c.id AS cliente_id,
    c.cli_nome,
    c.cli_cidade,
    c.cli_telefone,
    COUNT(v.id) AS vendas_count,
    COALESCE(SUM(v.ven_valor_total), 0) AS total_gasto,
    CASE 
        WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.ven_valor_total), 0) / COUNT(v.id) 
        ELSE 0 
    END AS ticket_medio,
    MAX(v.created_at) AS ultima_compra
FROM 
    public.tab_clientes c
LEFT JOIN 
    public.tab_vendas v ON c.id = v.ven_cliente_id AND v.ven_status = 'finalizada'
GROUP BY 
    c.id, c.cli_nome, c.cli_cidade, c.cli_telefone;

-- Garante que a view seja acessível
GRANT SELECT ON public.view_crm_analytics TO anon, authenticated;

-- Adição de índices para performance se não existirem
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON public.tab_vendas(ven_cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.tab_vendas(ven_status);

-- Comentário para documentação
COMMENT ON VIEW public.view_crm_analytics IS 'View que consolida dados de faturamento e comportamento de compra por cliente para o CRM.';

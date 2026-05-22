-- 1. Função para atualizar estoque ao inserir itens de venda
CREATE OR REPLACE FUNCTION public.fn_atualizar_estoque_venda()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.tab_produtos
    SET pro_estoque = COALESCE(pro_estoque, 0) - NEW.itv_quantidade
    WHERE id = NEW.itv_produto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger na tabela de itens de venda
DROP TRIGGER IF EXISTS trg_pos_venda_estoque ON public.tab_itens_venda;
CREATE TRIGGER trg_pos_venda_estoque
AFTER INSERT ON public.tab_itens_venda
FOR EACH ROW
EXECUTE FUNCTION public.fn_atualizar_estoque_venda();

-- 3. Atualização da view de CRM
CREATE OR REPLACE VIEW public.view_crm_analytics 
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

ALTER VIEW public.view_crm_analytics SET (security_invoker = true);

DROP VIEW IF EXISTS public.view_resumo_vendas_diario;
CREATE VIEW public.view_resumo_vendas_diario AS
 SELECT ((v.created_at AT TIME ZONE 'UTC'::text))::date AS data_referencia,
    count(DISTINCT v.id) AS total_vendas,
    sum(v.ven_valor_total) AS volume_vendas,
    sum((v.ven_valor_total - COALESCE(( SELECT sum((p.pro_valor_compra * (iv.itv_quantidade)::numeric)) AS sum
           FROM (tab_itens_venda iv
             JOIN tab_produtos p ON ((iv.itv_produto_id = p.id)))
          WHERE (iv.itv_venda_id = v.id) AND iv.itv_status = 'ativo'), (0)::numeric))) AS lucro_total
   FROM tab_vendas v
  GROUP BY (((v.created_at AT TIME ZONE 'UTC'::text))::date);

DROP VIEW IF EXISTS public.view_top_produtos;
CREATE VIEW public.view_top_produtos AS
 SELECT p.pro_descricao AS descricao,
    sum(iv.itv_quantidade) AS total_vendido,
    sum(iv.itv_valor_total) AS valor_total
   FROM (tab_itens_venda iv
     JOIN tab_produtos p ON ((iv.itv_produto_id = p.id)))
  WHERE (iv.itv_status = 'ativo')
  GROUP BY p.pro_descricao
  ORDER BY (sum(iv.itv_quantidade)) DESC;

DROP VIEW IF EXISTS public.view_top_produtos;
CREATE VIEW public.view_top_produtos AS
 SELECT 
    p.id AS produto_id,
    p.pro_descricao AS descricao,
    sum(iv.itv_quantidade) AS total_vendido,
    sum(iv.itv_valor_total) AS valor_total,
    sum(iv.itv_valor_total) AS receita_total
   FROM (tab_itens_venda iv
     JOIN tab_produtos p ON ((iv.itv_produto_id = p.id)))
  WHERE (iv.itv_status = 'ativo'::text)
  GROUP BY p.id, p.pro_descricao
  ORDER BY (sum(iv.itv_quantidade)) DESC;

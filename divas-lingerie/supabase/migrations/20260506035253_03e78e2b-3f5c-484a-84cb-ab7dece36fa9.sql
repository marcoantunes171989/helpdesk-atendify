DROP VIEW IF EXISTS public.view_visitas_detalhada;

CREATE VIEW public.view_visitas_detalhada AS
 SELECT v.id,
    v.vis_data_prevista,
    v.vis_data_real,
    v.vis_observacoes,
    v.vis_status,
    v.vis_motivo_cancelamento,
    v.created_at,
    v.user_id,
    c.id AS cliente_id,
    c.cli_nome AS cliente_nome,
    c.cli_cidade AS cliente_cidade,
    c.cli_endereco AS cliente_endereco,
    c.cli_numero AS cliente_numero,
    c.cli_bairro AS cliente_bairro,
    c.cli_telefone AS cliente_telefone,
    c.cli_documento AS cliente_documento,
    ( SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 
        'descricao', p.pro_descricao, 
        'cor', co.cor_nome,
        'tamanho', tam.tam_nome,
        'categoria', cat.cat_nome,
        'codigo', p.pro_codigo,
        'valor_unitario', p.pro_valor_venda
      )) AS jsonb_agg
           FROM tab_produtos p
             LEFT JOIN tab_cores co ON p.pro_cor_id = co.id
             LEFT JOIN tab_tamanhos tam ON p.pro_tamanho_id = tam.id
             LEFT JOIN tab_categorias cat ON p.pro_categoria_id = cat.id
          WHERE p.id = ANY (v.vis_produtos_ids)) AS produtos_detalhes
   FROM tab_visitas v
     JOIN tab_clientes c ON v.vis_cliente_id = c.id;

ALTER VIEW public.view_visitas_detalhada SET (security_invoker = true);

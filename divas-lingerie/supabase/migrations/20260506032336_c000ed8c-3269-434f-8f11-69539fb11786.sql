-- Criar uma restrição de unicidade para evitar visitas idênticas (mesmo cliente, mesma data e mesma observação)
-- Isso evita cliques duplos no botão de salvar ou registros acidentais repetidos.
ALTER TABLE public.tab_visitas 
ADD CONSTRAINT unique_visita_cliente_data_obs 
UNIQUE (vis_cliente_id, vis_data_prevista, vis_observacoes);

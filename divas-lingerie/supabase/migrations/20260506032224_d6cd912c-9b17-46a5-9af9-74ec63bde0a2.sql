-- Criar índice composto para otimizar filtros de usuário e cliente na listagem
CREATE INDEX IF NOT EXISTS idx_visitas_user_cliente ON public.tab_visitas (user_id, vis_cliente_id);

-- Criar índice para acelerar a ordenação por data (usado na view e na listagem)
CREATE INDEX IF NOT EXISTS idx_visitas_data_prevista ON public.tab_visitas (vis_data_prevista DESC);
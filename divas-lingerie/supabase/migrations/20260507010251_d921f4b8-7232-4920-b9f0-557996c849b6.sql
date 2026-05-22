-- Adiciona coluna para controle de exclusão lógica
ALTER TABLE public.tab_visitas 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Comentário para documentação
COMMENT ON COLUMN public.tab_visitas.deleted_at IS 'Data e hora em que o registro foi marcado como excluído logicamente.';

-- Cria um índice para otimizar as consultas que filtram por registros não excluídos
CREATE INDEX IF NOT EXISTS idx_tab_visitas_not_deleted ON public.tab_visitas (id) WHERE deleted_at IS NULL;

-- Atualiza a política de visualização para considerar o filtro de exclusão lógica
-- Nota: Como o Lovable gerencia as políticas, aqui apenas garantimos que a estrutura suporte a filtragem no código frontend primeiro.
-- Se houver políticas RLS existentes que precisem ser ajustadas, faríamos aqui.
-- Por agora, focaremos na alteração da mutation de deleção para um update no frontend.
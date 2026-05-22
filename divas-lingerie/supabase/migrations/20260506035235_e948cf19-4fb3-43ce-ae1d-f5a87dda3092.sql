-- Adicionar colunas de status e motivo de cancelamento
ALTER TABLE public.tab_visitas 
ADD COLUMN IF NOT EXISTS vis_status TEXT DEFAULT 'agendada',
ADD COLUMN IF NOT EXISTS vis_motivo_cancelamento TEXT;

-- Atualizar status com base na data real existente
UPDATE public.tab_visitas 
SET vis_status = 'concluída' 
WHERE vis_data_real IS NOT NULL AND vis_status = 'agendada';

-- Criar check constraint para status
ALTER TABLE public.tab_visitas 
DROP CONSTRAINT IF EXISTS check_visita_status;

ALTER TABLE public.tab_visitas 
ADD CONSTRAINT check_visita_status 
CHECK (vis_status IN ('agendada', 'concluída', 'cancelada'));

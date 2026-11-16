-- =============================================================================
-- ATENDEXA — Etapa A: anexos seguros (kb_attachments)
-- Executar no SQL Editor do Supabase do projeto Atendexa (produção).
-- Project ref esperado: gnotdvtorbnqfojurlpq
--
-- Seguro: NÃO apaga linhas, NÃO remove a coluna data, NÃO altera conteúdos.
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =============================================================================

BEGIN;

ALTER TABLE public.kb_attachments
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT;

ALTER TABLE public.kb_attachments
  ADD COLUMN IF NOT EXISTS "sha256" TEXT;

ALTER TABLE public.kb_attachments
  ALTER COLUMN "data" DROP NOT NULL;

COMMIT;

-- Conferência rápida (opcional):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'kb_attachments'
-- ORDER BY ordinal_position;

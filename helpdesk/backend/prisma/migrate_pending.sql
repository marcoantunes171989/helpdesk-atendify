-- =============================================================
-- MIGRATIONS PENDENTES — executar no Supabase SQL Editor
-- =============================================================

-- 1. Tornar companyId opcional em users
--    (era NOT NULL; bloqueia exclusão de empresa e criação de usuário sem empresa)
ALTER TABLE "users" ALTER COLUMN "companyId" DROP NOT NULL;

-- 2. Criar tabela de anexos de chamados (se ainda não existir)
CREATE TABLE IF NOT EXISTS "ticket_attachments" (
    "id"        TEXT        NOT NULL,
    "ticketId"  TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "mimeType"  TEXT        NOT NULL,
    "size"      INTEGER     NOT NULL,
    "data"      TEXT        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ticket_attachments"
    DROP CONSTRAINT IF EXISTS "ticket_attachments_ticketId_fkey";

ALTER TABLE "ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

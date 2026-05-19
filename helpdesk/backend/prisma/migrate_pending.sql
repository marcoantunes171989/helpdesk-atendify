-- =============================================================
-- MIGRATIONS PENDENTES — executar no Supabase SQL Editor
-- =============================================================

-- 1. Remover vínculo users <-> companies
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_companyId_fkey";
ALTER TABLE "users" DROP COLUMN IF EXISTS "companyId";

-- 2. Tornar companyId opcional em categories
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_companyId_fkey";
ALTER TABLE "categories" ALTER COLUMN "companyId" DROP NOT NULL;

-- 3. Adicionar campo employeeId em tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_employeeId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Criar tabela de status de chamados
CREATE TABLE IF NOT EXISTS "ticket_statuses" (
    "id"          TEXT         NOT NULL,
    "code"        INTEGER      NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "observation" TEXT,
    "color"       TEXT         NOT NULL DEFAULT '#6b7280',
    "active"      BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_statuses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_statuses_code_key" ON "ticket_statuses"("code");

-- 5. Adicionar campo statusId em tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "statusId" TEXT;
ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_statusId_fkey";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "ticket_statuses"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Criar tabela de anexos de chamados
CREATE TABLE IF NOT EXISTS "ticket_attachments" (
    "id"        TEXT         NOT NULL,
    "ticketId"  TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "mimeType"  TEXT         NOT NULL,
    "size"      INTEGER      NOT NULL,
    "data"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ticket_attachments" DROP CONSTRAINT IF EXISTS "ticket_attachments_ticketId_fkey";
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

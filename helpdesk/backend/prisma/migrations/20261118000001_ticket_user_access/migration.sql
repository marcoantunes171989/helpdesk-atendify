-- Acesso de usuários a chamados:
-- company_user_access: vê todos os chamados da empresa
-- ticket_user_access GRANT: vê só este chamado
-- ticket_user_access DENY: esconde este chamado mesmo com vínculo na empresa

DO $$ BEGIN
  CREATE TYPE "TicketAccessMode" AS ENUM ('GRANT', 'DENY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "company_user_access" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "company_user_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "company_user_access_companyId_userId_key"
  ON "company_user_access"("companyId", "userId");
CREATE INDEX IF NOT EXISTS "company_user_access_userId_idx"
  ON "company_user_access"("userId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'company_user_access_companyId_fkey'
  ) THEN
    ALTER TABLE "company_user_access"
      ADD CONSTRAINT "company_user_access_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'company_user_access_userId_fkey'
  ) THEN
    ALTER TABLE "company_user_access"
      ADD CONSTRAINT "company_user_access_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ticket_user_access" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mode" "TicketAccessMode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_user_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_user_access_ticketId_userId_key"
  ON "ticket_user_access"("ticketId", "userId");
CREATE INDEX IF NOT EXISTS "ticket_user_access_userId_idx"
  ON "ticket_user_access"("userId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ticket_user_access_ticketId_fkey'
  ) THEN
    ALTER TABLE "ticket_user_access"
      ADD CONSTRAINT "ticket_user_access_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ticket_user_access_userId_fkey'
  ) THEN
    ALTER TABLE "ticket_user_access"
      ADD CONSTRAINT "ticket_user_access_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

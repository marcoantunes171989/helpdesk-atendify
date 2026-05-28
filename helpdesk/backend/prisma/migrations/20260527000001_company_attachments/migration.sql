CREATE TABLE IF NOT EXISTS "company_attachments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "company_attachments_companyId_idx" ON "company_attachments"("companyId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'company_attachments_companyId_fkey'
  ) THEN
    ALTER TABLE "company_attachments"
      ADD CONSTRAINT "company_attachments_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "companies"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

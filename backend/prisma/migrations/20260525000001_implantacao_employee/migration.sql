-- AlterTable: add employeeId to implantacoes
ALTER TABLE "implantacoes" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'implantacoes_employeeId_fkey'
  ) THEN
    ALTER TABLE "implantacoes"
      ADD CONSTRAINT "implantacoes_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

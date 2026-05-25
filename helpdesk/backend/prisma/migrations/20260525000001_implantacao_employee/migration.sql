-- AlterTable: add employeeId to implantacoes
ALTER TABLE "implantacoes" ADD COLUMN "employeeId" TEXT;

ALTER TABLE "implantacoes"
  ADD CONSTRAINT "implantacoes_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

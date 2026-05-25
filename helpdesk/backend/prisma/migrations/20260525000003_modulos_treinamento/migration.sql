CREATE TABLE IF NOT EXISTS "modulos_treinamento" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "modulos_treinamento_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "etapas_treinamento" ADD COLUMN IF NOT EXISTS "moduloId" TEXT;
ALTER TABLE "etapas_treinamento" DROP COLUMN IF EXISTS "category";

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'etapas_treinamento_moduloId_fkey'
  ) THEN
    ALTER TABLE "etapas_treinamento"
      ADD CONSTRAINT "etapas_treinamento_moduloId_fkey"
      FOREIGN KEY ("moduloId") REFERENCES "modulos_treinamento"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

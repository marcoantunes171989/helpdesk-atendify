-- Etapa B: categorias gerenciáveis. Não apaga artigos existentes.
CREATE TABLE IF NOT EXISTS "kb_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'layers',
    "tone" TEXT NOT NULL DEFAULT 'sky',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kb_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "kb_categories_key_key" ON "kb_categories"("key");

ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_articles_categoryId_fkey'
  ) THEN
    ALTER TABLE "kb_articles"
      ADD CONSTRAINT "kb_articles_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "kb_categories"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "kb_articles_categoryId_idx" ON "kb_articles"("categoryId");

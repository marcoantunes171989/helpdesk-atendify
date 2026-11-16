-- Etapa C: tipo de conteúdo, URL externa e featured (Primeiros Passos).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KbContentType') THEN
    CREATE TYPE "KbContentType" AS ENUM ('ARTIGO', 'MANUAL', 'VIDEO', 'DOWNLOAD', 'LINK');
  END IF;
END $$;

ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "contentType" "KbContentType";
ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "kb_articles_contentType_idx" ON "kb_articles"("contentType");
CREATE INDEX IF NOT EXISTS "kb_articles_featured_idx" ON "kb_articles"("featured");

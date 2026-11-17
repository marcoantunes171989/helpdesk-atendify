-- Etapa D: contagem de visualizações (Mais Acessados).
ALTER TABLE "kb_articles" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "kb_article_views" (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kb_article_views_pkey" PRIMARY KEY ("userId", "articleId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_article_views_articleId_fkey'
  ) THEN
    ALTER TABLE "kb_article_views"
      ADD CONSTRAINT "kb_article_views_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "kb_articles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "kb_article_views_articleId_idx" ON "kb_article_views"("articleId");
CREATE INDEX IF NOT EXISTS "kb_articles_viewCount_idx" ON "kb_articles"("viewCount");

-- =============================================================================
-- ATENDEXA — Etapa D: visualizações / Mais Acessados
-- Executar no SQL Editor do Supabase (produção) ANTES do merge/deploy.
-- Idempotente. Não apaga artigos.
-- =============================================================================

BEGIN;

ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.kb_article_views (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kb_article_views_pkey PRIMARY KEY ("userId", "articleId")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_article_views_articleId_fkey'
  ) THEN
    ALTER TABLE public.kb_article_views
      ADD CONSTRAINT kb_article_views_articleId_fkey
      FOREIGN KEY ("articleId") REFERENCES public.kb_articles(id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS kb_article_views_articleId_idx ON public.kb_article_views("articleId");
CREATE INDEX IF NOT EXISTS kb_articles_viewCount_idx ON public.kb_articles("viewCount");

COMMIT;

-- Conferência:
-- SELECT id, title, "viewCount" FROM kb_articles ORDER BY "viewCount" DESC LIMIT 10;

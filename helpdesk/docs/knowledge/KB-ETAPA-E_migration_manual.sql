-- =============================================================================
-- ATENDEXA — Etapa E: favoritos e histórico no servidor
-- Executar no SQL Editor do Supabase (produção) ANTES do merge/deploy.
-- Idempotente. Não apaga artigos.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.kb_favorites (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kb_favorites_pkey PRIMARY KEY ("userId", "articleId")
);

CREATE TABLE IF NOT EXISTS public.kb_history (
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kb_history_pkey PRIMARY KEY ("userId", "articleId")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kb_favorites_userId_fkey') THEN
    ALTER TABLE public.kb_favorites
      ADD CONSTRAINT kb_favorites_userId_fkey
      FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kb_favorites_articleId_fkey') THEN
    ALTER TABLE public.kb_favorites
      ADD CONSTRAINT kb_favorites_articleId_fkey
      FOREIGN KEY ("articleId") REFERENCES public.kb_articles(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kb_history_userId_fkey') THEN
    ALTER TABLE public.kb_history
      ADD CONSTRAINT kb_history_userId_fkey
      FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kb_history_articleId_fkey') THEN
    ALTER TABLE public.kb_history
      ADD CONSTRAINT kb_history_articleId_fkey
      FOREIGN KEY ("articleId") REFERENCES public.kb_articles(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS kb_favorites_articleId_idx ON public.kb_favorites("articleId");
CREATE INDEX IF NOT EXISTS kb_history_userId_viewedAt_idx ON public.kb_history("userId", "viewedAt");

COMMIT;

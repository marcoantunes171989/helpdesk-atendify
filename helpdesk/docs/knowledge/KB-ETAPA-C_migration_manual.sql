-- =============================================================================
-- ATENDEXA — Etapa C: tipo de conteúdo, URL externa e Primeiros Passos
-- Executar no SQL Editor do Supabase (produção) ANTES do merge/deploy.
-- Idempotente. Não apaga artigos.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KbContentType') THEN
    CREATE TYPE "KbContentType" AS ENUM ('ARTIGO', 'MANUAL', 'VIDEO', 'DOWNLOAD', 'LINK');
  END IF;
END $$;

ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS "contentType" "KbContentType";

ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;

ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

-- Se contentType já existir como TEXT (tentativa parcial), converte para enum.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'kb_articles'
      AND column_name = 'contentType' AND udt_name = 'text'
  ) THEN
    ALTER TABLE public.kb_articles
      ALTER COLUMN "contentType" TYPE "KbContentType"
      USING (
        CASE
          WHEN "contentType" IN ('ARTIGO','MANUAL','VIDEO','DOWNLOAD','LINK')
            THEN "contentType"::"KbContentType"
          ELSE NULL
        END
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS kb_articles_contentType_idx ON public.kb_articles("contentType");
CREATE INDEX IF NOT EXISTS kb_articles_featured_idx ON public.kb_articles(featured);

-- Backfill por tags (mesma convenção do frontend)
UPDATE public.kb_articles
SET "contentType" = 'MANUAL'
WHERE "contentType" IS NULL
  AND tags ~* '(^|,\s*)(manual|manuais|documento)(,|$)';

UPDATE public.kb_articles
SET "contentType" = 'VIDEO'
WHERE "contentType" IS NULL
  AND tags ~* '(^|,\s*)(video|videos|vídeo|vídeos|tutorial|tutoriais)(,|$)';

UPDATE public.kb_articles
SET "contentType" = 'DOWNLOAD'
WHERE "contentType" IS NULL
  AND tags ~* '(^|,\s*)(download|downloads|arquivo)(,|$)';

UPDATE public.kb_articles
SET "contentType" = 'LINK'
WHERE "contentType" IS NULL
  AND tags ~* '(^|,\s*)(link|links|site)(,|$)';

UPDATE public.kb_articles
SET "contentType" = 'ARTIGO'
WHERE "contentType" IS NULL
  AND tags ~* '(^|,\s*)(artigo|artigos|guia)(,|$)';

UPDATE public.kb_articles
SET featured = true
WHERE featured = false
  AND tags ~* '(primeiros\s*passos|introducao|introdução|onboarding|iniciante|comece\s*por\s*aqui)';

COMMIT;

-- Conferência:
-- SELECT "contentType", featured, COUNT(*) FROM kb_articles GROUP BY 1, 2 ORDER BY 1, 2;

-- =============================================================================
-- ATENDEXA — Etapa B: categorias gerenciáveis
-- Executar no SQL Editor do Supabase (produção) ANTES do deploy completo.
-- Seguro e idempotente: não apaga artigos.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.kb_categories (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'layers',
    tone TEXT NOT NULL DEFAULT 'sky',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.kb_articles
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kb_articles_categoryId_fkey'
  ) THEN
    ALTER TABLE public.kb_articles
      ADD CONSTRAINT kb_articles_categoryId_fkey
      FOREIGN KEY ("categoryId") REFERENCES public.kb_categories(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS kb_articles_categoryId_idx ON public.kb_articles("categoryId");

-- Seed das 6 categorias da referência (só insere se a key ainda não existir)
INSERT INTO public.kb_categories (id, key, label, icon, tone, "sortOrder", active, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.key, v.label, v.icon, v.tone, v.sort_order, true, NOW(), NOW()
FROM (VALUES
  ('configuracoes', 'Configurações', 'settings', 'purple', 10),
  ('treinamentos', 'Treinamentos', 'graduation', 'blue', 20),
  ('operacao', 'Operação do Sistema', 'monitor', 'green', 30),
  ('equipamentos', 'Equipamentos', 'printer', 'orange', 40),
  ('fiscal', 'Fiscal', 'fileText', 'red', 50),
  ('outros', 'Outros', 'layers', 'sky', 60)
) AS v(key, label, icon, tone, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_categories c WHERE c.key = v.key
);

-- Backfill: enum legado → categoryId
UPDATE public.kb_articles a
SET "categoryId" = c.id
FROM public.kb_categories c
WHERE a."categoryId" IS NULL
  AND a.category = 'CONFIGURACAO'
  AND c.key = 'configuracoes';

UPDATE public.kb_articles a
SET "categoryId" = c.id
FROM public.kb_categories c
WHERE a."categoryId" IS NULL
  AND a.category IN ('DUVIDA', 'ERRO')
  AND c.key = 'outros';

COMMIT;

-- Conferência:
-- SELECT key, label, (SELECT COUNT(*) FROM kb_articles a WHERE a."categoryId" = c.id) AS artigos
-- FROM kb_categories c ORDER BY "sortOrder";

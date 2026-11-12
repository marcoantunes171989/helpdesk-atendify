-- ============================================================================
-- RBAC-09E — Versão operacional da migration RBAC para execução manual
-- ============================================================================
-- ORIGEM (não alterada): helpdesk/backend/prisma/migrations/20261110000001_rbac_access_control/migration.sql
-- Este arquivo é uma cópia reorganizada para execução supervisionada no
-- SQL Editor do Supabase (ou psql). NÃO é uma migration Prisma, não deve ser
-- copiado para prisma/migrations/, e NÃO deve ser executado por este
-- procedimento sem autorização explícita do proprietário do projeto.
--
-- PROIBIDO neste procedimento: prisma migrate deploy, prisma migrate resolve,
-- prisma db push. A tabela _prisma_migrations está ausente em produção
-- (confirmado em INFRAESTRUTURA.md, seção 12) — este banco nunca foi
-- gerenciado pelo histórico Prisma, então qualquer comando de migração do
-- Prisma criaria uma baseline inconsistente. A única via autorizada é SQL
-- puro controlado, exatamente como abaixo.
--
-- Nenhum DROP, TRUNCATE ou alteração destrutiva está presente neste script.
-- Todas as operações são aditivas (ADD COLUMN IF NOT EXISTS, CREATE TABLE
-- IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, ADD CONSTRAINT protegido por
-- DO $$ ... EXCEPTION WHEN duplicate_object).
--
-- IMPORTANTE sobre IF NOT EXISTS: isso evita erro se o objeto já existe com
-- o MESMO formato esperado. NÃO garante compatibilidade se um objeto
-- existente tiver tipo, default ou estrutura diferente do esperado (ex.: uma
-- coluna "username" pré-existente de tipo incompatível, ou uma tabela
-- "access_groups" criada manualmente com colunas diferentes). Por isso a
-- FASE 0 (pré-verificação) abaixo é obrigatória antes de prosseguir: seu
-- objetivo é detectar justamente esse tipo de incompatibilidade antes da
-- transação de escrita.
--
-- COMO USAR:
--   1. Execute a FASE 0 isoladamente (é só SELECT, não escreve nada).
--      Leia o resultado e confirme manualmente que está tudo "ausente" ou
--      "compatível" antes de continuar.
--   2. Só então execute a FASE 1 (BEGIN ... COMMIT) como um único bloco.
--   3. Execute a FASE 2 (validação pós-execução) e confirme os números.
--   4. Se qualquer coisa parecer errada entre o BEGIN e o COMMIT, NÃO execute
--      o COMMIT: execute ROLLBACK e pare. Ver seção "Estratégia de erro".
-- ============================================================================


-- ============================================================================
-- FASE 0 — PRÉ-VERIFICAÇÃO (somente leitura, fora de transação)
-- ============================================================================
-- Execute isto primeiro e revise a saída. Não altera nada no banco.

-- 0.1 — As 4 tabelas RBAC já existem? (esperado: 0 linhas = nenhuma existe ainda)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('access_groups', 'permissions', 'access_group_permissions', 'audit_logs');

-- 0.2 — As 3 colunas RBAC já existem em "users"? (esperado: 0 linhas)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('username', 'accessGroupId', 'tokenVersion');

-- 0.3 — Confirmar que "users" existe e ver sua estrutura atual (contexto, não
-- deve ser alterado por esta migration além das 3 colunas acima).
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 0.4 — Confirmar ausência de _prisma_migrations (esperado: 0 linhas, já
-- reconfirmado anteriormente, mas repetir aqui por segurança antes de escrever).
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = '_prisma_migrations';

-- 0.5 — Checar se já existe algum objeto com nomes conflitantes mas de origem
-- diferente (ex.: índice "users_username_key" já usado por outra coluna).
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'users_username_key', 'users_accessGroupId_idx',
    'access_groups_name_key', 'permissions_key_key', 'permissions_module_idx',
    'access_group_permissions_accessGroupId_permissionId_key',
    'audit_logs_resource_resourceId_idx', 'audit_logs_createdAt_idx'
  );

-- CRITÉRIO DE INTERRUPÇÃO DA FASE 0:
--   - 0.1 ou 0.2 retornarem linhas com estrutura DIFERENTE da esperada
--     (tipo errado, nullable errado, etc.) → NÃO prosseguir. Investigar antes.
--   - 0.1/0.2 retornarem exatamente o que a migration criaria (ex.: reaplicação
--     seguinte de uma execução já bem-sucedida) → pode prosseguir, o script é
--     idempotente, mas registrar esse fato no relatório de execução.
--   - 0.4 retornar 1 linha (tabela existe) → PARAR. Contradiz a premissa
--     documentada (seção 12 de INFRAESTRUTURA.md) e exige reavaliação completa
--     da estratégia antes de qualquer escrita.
--   - 0.5 retornar índice cujo indexdef não corresponde ao que a migration
--     criaria → PARAR. Conflito de nome com objeto de origem desconhecida.


-- ============================================================================
-- FASE 1 — EXECUÇÃO CONTROLADA (transação explícita)
-- ============================================================================
-- Execute este bloco inteiro de uma vez no SQL Editor. Se o editor não exibir
-- erro nenhum e chegar até o COMMIT, a migration foi aplicada. Se qualquer
-- statement falhar, o Postgres entra em "transação abortada": nenhum comando
-- seguinte (incluindo os demais desta mesma transação) terá efeito até um
-- ROLLBACK explícito. Isso é o comportamento desejado: falha parcial não é
-- possível dentro deste bloco.

BEGIN;

-- 1.1 — Colunas novas em "users" (aditivo, sem default destrutivo)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accessGroupId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- 1.2 — Tabelas novas
CREATE TABLE IF NOT EXISTS "access_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "access_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "access_group_permissions" (
    "id" TEXT NOT NULL,
    "accessGroupId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_group_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- 1.3 — Índices
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE INDEX IF NOT EXISTS "users_accessGroupId_idx" ON "users"("accessGroupId");

CREATE UNIQUE INDEX IF NOT EXISTS "access_groups_name_key" ON "access_groups"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_key_key" ON "permissions"("key");
CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");
CREATE UNIQUE INDEX IF NOT EXISTS "access_group_permissions_accessGroupId_permissionId_key" ON "access_group_permissions"("accessGroupId", "permissionId");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- 1.4 — Foreign keys (protegidas contra duplicidade; idempotentes)
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_accessGroupId_fkey"
    FOREIGN KEY ("accessGroupId") REFERENCES "access_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "access_group_permissions" ADD CONSTRAINT "access_group_permissions_accessGroupId_fkey"
    FOREIGN KEY ("accessGroupId") REFERENCES "access_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "access_group_permissions" ADD CONSTRAINT "access_group_permissions_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.5 — Verificação interna pré-commit: se algo essencial não existir agora,
-- aborta a transação de propósito (RAISE EXCEPTION força ROLLBACK automático
-- antes mesmo de chegar ao COMMIT abaixo).
DO $$
DECLARE
  missing_tables INT;
  missing_columns INT;
BEGIN
  SELECT count(*) INTO missing_tables
  FROM (VALUES ('access_groups'), ('permissions'), ('access_group_permissions'), ('audit_logs')) AS t(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.name
  );

  SELECT count(*) INTO missing_columns
  FROM (VALUES ('username'), ('accessGroupId'), ('tokenVersion')) AS c(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = c.name
  );

  IF missing_tables > 0 OR missing_columns > 0 THEN
    RAISE EXCEPTION 'RBAC-09E: validacao interna falhou — tabelas ausentes=%, colunas ausentes=%', missing_tables, missing_columns;
  END IF;
END $$;

-- Revisar a saída acima. Se não houve nenhum erro/exception, prosseguir.
-- NÃO executar COMMIT automaticamente — ler o resultado primeiro.
COMMIT;

-- Se preferir abortar depois de revisar (por qualquer motivo, mesmo sem erro
-- técnico), execute ROLLBACK; em vez do COMMIT acima. Nenhuma alteração fica
-- persistida nesse caso.


-- ============================================================================
-- FASE 2 — VALIDAÇÃO PÓS-EXECUÇÃO (somente leitura, fora de transação)
-- ============================================================================
-- Execute após o COMMIT da Fase 1.

-- 2.1 — Confirmar as 4 tabelas (esperado: 4 linhas)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('access_groups', 'permissions', 'access_group_permissions', 'audit_logs')
ORDER BY table_name;

-- 2.2 — Confirmar as 3 colunas em "users" com tipos corretos (esperado: 3 linhas)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name IN ('username', 'accessGroupId', 'tokenVersion')
ORDER BY column_name;

-- 2.3 — Confirmar índices (esperado: 8 linhas)
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'users_username_key', 'users_accessGroupId_idx',
    'access_groups_name_key', 'permissions_key_key', 'permissions_module_idx',
    'access_group_permissions_accessGroupId_permissionId_key',
    'audit_logs_resource_resourceId_idx', 'audit_logs_createdAt_idx'
  )
ORDER BY indexname;

-- 2.4 — Confirmar FKs (esperado: 4 linhas)
SELECT conname, conrelid::regclass AS tabela, confrelid::regclass AS referencia
FROM pg_constraint
WHERE conname IN (
  'users_accessGroupId_fkey',
  'access_group_permissions_accessGroupId_fkey',
  'access_group_permissions_permissionId_fkey',
  'audit_logs_actorId_fkey'
)
ORDER BY conname;

-- 2.5 — Confirmar que nenhum usuário existente foi afetado negativamente
-- (contagem de usuários antes/depois deve ser igual; apenas colunas novas
-- com valores default/NULL, nenhuma linha removida ou duplicada)
SELECT count(*) AS total_usuarios,
       count(*) FILTER (WHERE "tokenVersion" = 0) AS com_tokenversion_default,
       count(*) FILTER (WHERE "accessGroupId" IS NULL) AS sem_grupo_ainda
FROM "users";

-- CRITÉRIO DE INTERRUPÇÃO DA FASE 2 (equivale à Fase C do plano em
-- INFRAESTRUTURA.md seção 13): se 2.1 ≠ 4 linhas, 2.2 ≠ 3 linhas, 2.3 ≠ 8
-- linhas ou 2.4 ≠ 4 linhas → NÃO prosseguir para o seed (Fase D/seção 13).
-- Investigar a divergência; considerar restaurar backup se houve alteração
-- estrutural inesperada em "users".


-- ============================================================================
-- ESTRATÉGIA DE ERRO E TRANSAÇÃO ABORTADA
-- ============================================================================
-- Se qualquer statement da FASE 1 falhar antes do COMMIT:
--   1. O Postgres marca a sessão/transação como abortada. Qualquer comando
--      adicional (exceto ROLLBACK) retornará erro "current transaction is
--      aborted, commands ignored until end of transaction block".
--   2. Executar ROLLBACK explicitamente. Isso desfaz TODAS as alterações da
--      Fase 1 (nada fica parcialmente aplicado — é tudo ou nada).
--   3. Registrar o erro exato (mensagem completa) antes de tentar novamente.
--   4. NÃO reexecutar a Fase 1 sem entender a causa raiz. Se a causa for um
--      objeto pré-existente incompatível detectado só em runtime (não
--      capturado na Fase 0), atualizar a Fase 0 com uma verificação
--      específica para esse caso antes de tentar de novo.
--   5. Se o erro ocorrer e não for óbvio que o ROLLBACK foi completo, rodar
--      a FASE 0 de novo (é só leitura) para confirmar que o estado do banco
--      voltou ao que era antes da tentativa.
-- ============================================================================

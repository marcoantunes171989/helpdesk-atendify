-- RBAC-01: Grupos de Acesso, Permissões e Auditoria
-- Migração aditiva: não remove nem altera colunas/dados existentes.
-- NÃO aplicar diretamente em produção sem revisão e janela planejada.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "accessGroupId" TEXT;
-- RBAC-03 ETAPA 3: versionamento de sessão/token para revogação de JWT
-- (troca/reset de senha, desativação, mudança crítica de autorização).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

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

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE INDEX IF NOT EXISTS "users_accessGroupId_idx" ON "users"("accessGroupId");

CREATE UNIQUE INDEX IF NOT EXISTS "access_groups_name_key" ON "access_groups"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_key_key" ON "permissions"("key");
CREATE INDEX IF NOT EXISTS "permissions_module_idx" ON "permissions"("module");
CREATE UNIQUE INDEX IF NOT EXISTS "access_group_permissions_accessGroupId_permissionId_key" ON "access_group_permissions"("accessGroupId", "permissionId");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

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

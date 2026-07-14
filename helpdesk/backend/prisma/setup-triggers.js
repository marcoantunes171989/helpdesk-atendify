const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[setup-triggers] iniciando...');

  // 0. Schema patches — fallback para quando prisma migrate deploy não roda em produção

  // tickets.satisfaction / satisfactionAt (avaliação CSAT do cliente)
  await prisma.$executeRawUnsafe(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "satisfaction" INTEGER`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "satisfactionAt" TIMESTAMP(3)`);

  // implantacoes.employeeId
  await prisma.$executeRawUnsafe(`ALTER TABLE "implantacoes" ADD COLUMN IF NOT EXISTS "employeeId" TEXT`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'implantacoes_employeeId_fkey'
      ) THEN
        ALTER TABLE "implantacoes"
          ADD CONSTRAINT "implantacoes_employeeId_fkey"
          FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$
  `);

  // Tabelas da agenda técnica
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "agenda_visitas" (
      "id" TEXT NOT NULL, "tecnico" TEXT NOT NULL, "cliente" TEXT NOT NULL,
      "tipo" TEXT, "data" TEXT, "mes" TEXT, "obs" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "agenda_visitas_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "agenda_plantoes" (
      "id" TEXT NOT NULL, "data" TEXT, "tecnico" TEXT NOT NULL,
      "tipo" TEXT, "aba" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "agenda_plantoes_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "agenda_ferias" (
      "id" TEXT NOT NULL, "colaborador" TEXT NOT NULL,
      "mes" TEXT, "periodo" TEXT, "tipo" TEXT, "equipe" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "agenda_ferias_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "agenda_tecnicos" (
      "id" TEXT NOT NULL, "nome" TEXT NOT NULL,
      "equipe" TEXT, "modalidade" TEXT, "horario" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "agenda_tecnicos_pkey" PRIMARY KEY ("id")
    )
  `);

  // implantacao_fases.employeeIds
  await prisma.$executeRawUnsafe(`ALTER TABLE "implantacao_fases" ADD COLUMN IF NOT EXISTS "employeeIds" TEXT`);
  // implantacao_fases.etapaTreinamentoId
  await prisma.$executeRawUnsafe(`ALTER TABLE "implantacao_fases" ADD COLUMN IF NOT EXISTS "etapaTreinamentoId" TEXT`);
  // visitas.topicTreinoEmps
  await prisma.$executeRawUnsafe(`ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "topicTreinoEmps" TEXT`);

  // Tabela de módulos de treinamento
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "modulos_treinamento" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "order" INTEGER,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "modulos_treinamento_pkey" PRIMARY KEY ("id")
    )
  `);

  // Tabela de etapas de treinamento
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "etapas_treinamento" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "order" INTEGER,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "etapas_treinamento_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "etapas_treinamento" ADD COLUMN IF NOT EXISTS "moduloId" TEXT`);
  await prisma.$executeRawUnsafe(`
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
    END $$
  `);

  // Tabela de anexos de empresa
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "company_attachments" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "data" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "company_attachments_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "company_attachments_companyId_idx" ON "company_attachments"("companyId")`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'company_attachments_companyId_fkey'
      ) THEN
        ALTER TABLE "company_attachments"
          ADD CONSTRAINT "company_attachments_companyId_fkey"
          FOREIGN KEY ("companyId") REFERENCES "companies"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);

  console.log('[setup-triggers] schema patches OK');

  // 1. Sequences
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS seq_company_code START 1`);
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS seq_user_code START 1`);
  await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS seq_employee_code START 1`);
  console.log('✓ Sequences criadas');

  // 2. Tabela de códigos reciclados
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS recycled_codes (
      id         SERIAL PRIMARY KEY,
      entity_type VARCHAR(50) NOT NULL,
      code       INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✓ Tabela recycled_codes criada');

  // 3. Função principal: retorna próximo código disponível
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_next_code(p_entity VARCHAR)
    RETURNS INTEGER AS $$
    DECLARE
      v_code   INTEGER;
      v_row_id INTEGER;
    BEGIN
      SELECT id, code INTO v_row_id, v_code
      FROM recycled_codes
      WHERE entity_type = p_entity
      ORDER BY code ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF v_row_id IS NOT NULL THEN
        DELETE FROM recycled_codes WHERE id = v_row_id;
        RETURN v_code;
      END IF;

      IF p_entity = 'company'  THEN RETURN nextval('seq_company_code');  END IF;
      IF p_entity = 'user'     THEN RETURN nextval('seq_user_code');     END IF;
      IF p_entity = 'employee' THEN RETURN nextval('seq_employee_code'); END IF;

      RETURN nextval('seq_company_code');
    END;
    $$ LANGUAGE plpgsql
  `);

  // 4. Função: recicla um código liberado
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION fn_recycle_code(p_entity VARCHAR, p_code INTEGER)
    RETURNS VOID AS $$
    BEGIN
      IF p_code IS NOT NULL THEN
        INSERT INTO recycled_codes (entity_type, code) VALUES (p_entity, p_code);
      END IF;
    END;
    $$ LANGUAGE plpgsql
  `);
  console.log('✓ Funções auxiliares criadas');

  // ── COMPANY ──────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_company_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.code IS NULL THEN
        NEW.code = fn_next_code('company');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_company_assign_code ON companies`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_company_assign_code
      BEFORE INSERT ON companies
      FOR EACH ROW EXECUTE FUNCTION trg_fn_company_insert()
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_company_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM fn_recycle_code('company', OLD.code);
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_company_recycle_code ON companies`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_company_recycle_code
      AFTER DELETE ON companies
      FOR EACH ROW EXECUTE FUNCTION trg_fn_company_delete()
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_company_update()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.active = TRUE AND NEW.active = FALSE AND NEW.code IS NOT NULL THEN
        PERFORM fn_recycle_code('company', NEW.code);
        NEW.code = NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_company_deactivate_code ON companies`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_company_deactivate_code
      BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION trg_fn_company_update()
  `);
  console.log('✓ Triggers de company criados');

  // ── USER ──────────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_user_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.code IS NULL THEN
        NEW.code = fn_next_code('user');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_user_assign_code ON users`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_user_assign_code
      BEFORE INSERT ON users
      FOR EACH ROW EXECUTE FUNCTION trg_fn_user_insert()
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_user_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM fn_recycle_code('user', OLD.code);
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_user_recycle_code ON users`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_user_recycle_code
      AFTER DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION trg_fn_user_delete()
  `);
  console.log('✓ Triggers de user criados');

  // ── EMPLOYEE ──────────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_employee_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.code IS NULL THEN
        NEW.code = fn_next_code('employee');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_employee_assign_code ON employees`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_employee_assign_code
      BEFORE INSERT ON employees
      FOR EACH ROW EXECUTE FUNCTION trg_fn_employee_insert()
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_employee_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM fn_recycle_code('employee', OLD.code);
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_employee_recycle_code ON employees`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_employee_recycle_code
      AFTER DELETE ON employees
      FOR EACH ROW EXECUTE FUNCTION trg_fn_employee_delete()
  `);

  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION trg_fn_employee_update()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Quando a desativação vem de uma cascata da empresa, preserva o código
      -- (a empresa está apenas temporariamente inativa; ao reativar tudo volta)
      IF current_setting('app.cascade_active', true) = 'true' THEN
        RETURN NEW;
      END IF;
      IF OLD.active = TRUE AND NEW.active = FALSE AND NEW.code IS NOT NULL THEN
        PERFORM fn_recycle_code('employee', NEW.code);
        NEW.code = NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_employee_deactivate_code ON employees`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_employee_deactivate_code
      BEFORE UPDATE ON employees
      FOR EACH ROW EXECUTE FUNCTION trg_fn_employee_update()
  `);
  console.log('✓ Triggers de employee criados');

  // ── CASCATA EMPRESA → FUNCIONÁRIOS ────────────────────────────────────
  // Ao inativar/reativar a empresa, propaga o status active para todos os
  // funcionários vinculados. Usa flag de sessão (app.cascade_active) para que
  // o trigger de employee preserve os códigos durante a cascata.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION cascade_company_active_to_employees()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.active IS DISTINCT FROM NEW.active THEN
        PERFORM set_config('app.cascade_active', 'true', true);
        UPDATE employees
        SET active = NEW.active
        WHERE "companyId" = NEW.id;
        PERFORM set_config('app.cascade_active', 'false', true);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_cascade_company_active ON companies`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_cascade_company_active
      AFTER UPDATE OF active ON companies
      FOR EACH ROW EXECUTE FUNCTION cascade_company_active_to_employees()
  `);
  console.log('✓ Trigger de cascata empresa→funcionários criado');

  // 5. Backfill registros existentes sem código
  const companies = await prisma.$executeRawUnsafe(
    `UPDATE companies SET code = nextval('seq_company_code') WHERE code IS NULL`
  );
  const users = await prisma.$executeRawUnsafe(
    `UPDATE users SET code = nextval('seq_user_code') WHERE code IS NULL`
  );
  const employees = await prisma.$executeRawUnsafe(
    `UPDATE employees SET code = nextval('seq_employee_code') WHERE code IS NULL`
  );
  console.log(`✓ Backfill: ${companies} empresas, ${users} usuários, ${employees} funcionários`);

  console.log('[setup-triggers] ✅ concluído com sucesso!');
}

// Permite ser chamado via require() ou como script standalone
if (require.main === module) {
  main()
    .catch(e => { console.error('[setup-triggers] Erro:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

module.exports = async function runSetupTriggers() {
  try {
    await main();
  } catch (e) {
    console.error('[setup-triggers] Erro (não fatal):', e.message);
  } finally {
    try { await prisma.$disconnect(); } catch (_) {}
  }
};

// Sincroniza a tabela `permissions` com o catálogo central (src/permissions/catalog.js).
// Idempotente — pode ser executado quantas vezes quiser, não altera grupos ou usuários.
// Rodar manualmente em ambiente local/homologação: node prisma/seed-permissions.js
// NÃO está ligado ao script `start` (produção) — ver ETAPA 8 do RBAC-01.
const { PrismaClient } = require('@prisma/client');
const { PERMISSIONS } = require('../src/permissions/catalog');

const prisma = new PrismaClient();

async function main() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { module: perm.module, action: perm.action, description: perm.description },
      create: perm,
    });
  }
  console.log(`[seed-permissions] ${PERMISSIONS.length} permissões sincronizadas.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

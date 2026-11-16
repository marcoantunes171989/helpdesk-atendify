const prisma = require('../prisma');
const { ROLE_DEFAULT_PERMISSIONS, PERMISSION_KEYS } = require('./catalog');
const { isMissingColumnError } = require('../utils/schemaCompat');

// Resolve o conjunto efetivo de permissões de um usuário.
// SUPER_ADMIN sempre tem acesso total (bypass) — regra preservada do sistema atual.
// Usuário com grupo de acesso ativo usa as permissões do grupo.
// Usuário sem grupo (legado) usa o mapeamento padrão por Role, para não perder acesso.
async function resolveEffectivePermissions(user) {
  if (!user) return new Set();
  if (user.role === 'SUPER_ADMIN') return new Set(PERMISSION_KEYS);

  if (user.accessGroupId) {
    try {
      const group = await prisma.accessGroup.findUnique({
        where: { id: user.accessGroupId },
        include: { permissions: { include: { permission: true } } },
      });
      if (group && group.active) {
        return new Set(group.permissions.map(gp => gp.permission.key));
      }
    } catch (err) {
      // Tabelas RBAC ainda não aplicadas: cai no padrão do Role.
      if (!isMissingColumnError(err) && !String(err.message || '').includes('does not exist')) {
        throw err;
      }
    }
    // Grupo desativado ou removido: cai para o padrão do Role (nunca escala acima dele)
  }

  return new Set(ROLE_DEFAULT_PERMISSIONS[user.role] || []);
}

module.exports = { resolveEffectivePermissions };

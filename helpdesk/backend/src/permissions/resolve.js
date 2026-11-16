const prisma = require('../prisma');
const { ROLE_DEFAULT_PERMISSIONS, PERMISSION_KEYS } = require('./catalog');
const { isMissingColumnError } = require('../utils/schemaCompat');

// Cache curto das permissões de cada grupo: evita 3 joins (grupo → vínculo →
// permissão) em toda requisição protegida. Alterações em grupos chamam
// clearGroupPermissionCache() para refletir na hora neste processo; o TTL é
// a rede de segurança para outras instâncias.
const GROUP_CACHE_TTL_MS = 15_000;
const groupCache = new Map();

function clearGroupPermissionCache(groupId) {
  if (groupId) groupCache.delete(groupId);
  else groupCache.clear();
}

async function loadGroupPermissions(groupId) {
  const cached = groupCache.get(groupId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const group = await prisma.accessGroup.findUnique({
    where: { id: groupId },
    select: { active: true, permissions: { select: { permission: { select: { key: true } } } } },
  });
  const value = group && group.active
    ? new Set(group.permissions.map(gp => gp.permission.key))
    : null;
  groupCache.set(groupId, { value, expiresAt: Date.now() + GROUP_CACHE_TTL_MS });
  return value;
}

// Resolve o conjunto efetivo de permissões de um usuário.
// SUPER_ADMIN sempre tem acesso total (bypass) — regra preservada do sistema atual.
// Usuário com grupo de acesso ativo usa as permissões do grupo.
// Usuário sem grupo (legado) usa o mapeamento padrão por Role, para não perder acesso.
async function resolveEffectivePermissions(user) {
  if (!user) return new Set();
  if (user.role === 'SUPER_ADMIN') return new Set(PERMISSION_KEYS);

  if (user.accessGroupId) {
    try {
      const groupPermissions = await loadGroupPermissions(user.accessGroupId);
      if (groupPermissions) return new Set(groupPermissions);
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

module.exports = { resolveEffectivePermissions, clearGroupPermissionCache };

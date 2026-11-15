const prisma = require('../prisma');
const { PERMISSION_KEYS } = require('../permissions/catalog');
const { logAudit } = require('../utils/audit');

const groupSelect = {
  id: true, name: true, description: true, active: true,
  createdAt: true, updatedAt: true,
  _count: { select: { users: true } },
  permissions: { select: { permission: { select: { key: true } } } },
};

const serialize = (group) => ({
  id: group.id,
  name: group.name,
  description: group.description,
  active: group.active,
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
  usersCount: group._count?.users ?? 0,
  permissions: group.permissions.map(p => p.permission.key),
});

exports.list = async (req, res) => {
  const { search, active } = req.query;
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (active !== undefined) where.active = active === 'true';

  const groups = await prisma.accessGroup.findMany({
    where, select: groupSelect, orderBy: { name: 'asc' },
  });
  res.json(groups.map(serialize));
};

exports.get = async (req, res) => {
  const group = await prisma.accessGroup.findUnique({ where: { id: req.params.id }, select: groupSelect });
  if (!group) return res.status(404).json({ error: 'Grupo de acesso não encontrado' });
  res.json(serialize(group));
};

function validPermissionKeys(keys) {
  if (!Array.isArray(keys)) return [];
  return keys.filter(k => PERMISSION_KEYS.includes(k));
}

// Impede que um administrador crie/edite um grupo concedendo permissões que
// ele mesmo não possui (ETAPA 4.1/4.2 — vedar escalonamento de privilégios).
function assertNoEscalation(keys, actorPermissions, actorRole) {
  if (actorRole === 'SUPER_ADMIN') return null;
  const exceeded = keys.filter(k => !actorPermissions.has(k));
  if (exceeded.length > 0) {
    return `Você não pode conceder permissões que você mesmo não possui: ${exceeded.join(', ')}`;
  }
  return null;
}

exports.create = async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do grupo é obrigatório' });

  const existing = await prisma.accessGroup.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (existing) return res.status(409).json({ error: 'Já existe um grupo com esse nome' });

  const keys = validPermissionKeys(permissions);
  const escalationError = assertNoEscalation(keys, req.permissions, req.dbUser.role);
  if (escalationError) return res.status(403).json({ error: escalationError });

  const group = await prisma.accessGroup.create({
    data: {
      name, description,
      permissions: {
        create: await Promise.all(keys.map(async key => {
          const perm = await prisma.permission.findUnique({ where: { key } });
          return { permissionId: perm.id };
        })),
      },
    },
    select: groupSelect,
  });

  await logAudit({ actorId: req.dbUser.id, actorName: req.dbUser.name, action: 'access_group.create', resource: 'AccessGroup', resourceId: group.id, metadata: { name, permissions: keys } });
  res.status(201).json(serialize(group));
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, description, active, permissions } = req.body;

  const target = await prisma.accessGroup.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Grupo de acesso não encontrado' });

  if (name && name !== target.name) {
    const byName = await prisma.accessGroup.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } } });
    if (byName) return res.status(409).json({ error: 'Já existe um grupo com esse nome' });
  }

  const data = { name, description, active };
  if (permissions !== undefined) {
    const keys = validPermissionKeys(permissions);
    const escalationError = assertNoEscalation(keys, req.permissions, req.dbUser.role);
    if (escalationError) return res.status(403).json({ error: escalationError });
    const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });
    data.permissions = {
      deleteMany: {},
      create: perms.map(p => ({ permissionId: p.id })),
    };
  }

  const group = await prisma.accessGroup.update({ where: { id }, data, select: groupSelect });

  await logAudit({ actorId: req.dbUser.id, actorName: req.dbUser.name, action: 'access_group.update', resource: 'AccessGroup', resourceId: id, metadata: { name, active, permissions } });
  res.json(serialize(group));
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const usersCount = await prisma.user.count({ where: { accessGroupId: id } });
  if (usersCount > 0) {
    return res.status(409).json({
      error: `Este grupo possui ${usersCount} usuário(s) vinculado(s) e não pode ser excluído. Reatribua os usuários a outro grupo primeiro.`,
      usersCount,
    });
  }

  await prisma.accessGroup.delete({ where: { id } });
  await logAudit({ actorId: req.dbUser.id, actorName: req.dbUser.name, action: 'access_group.delete', resource: 'AccessGroup', resourceId: id });
  res.json({ message: 'Grupo de acesso excluído com sucesso' });
};

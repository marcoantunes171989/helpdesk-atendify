const bcrypt = require('bcryptjs');
const prisma = require('../prisma');
const { logAudit } = require('../utils/audit');
const statusCache = require('../utils/userStatusCache');

const userSelect = {
  id: true, code: true, name: true, username: true, email: true,
  role: true, accessGroupId: true, active: true, createdAt: true,
  accessGroup: { select: { id: true, name: true, active: true } },
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const ROLE_RANK = { SUPER_ADMIN: 4, ADMIN: 3, AGENT: 2, CLIENT: 1 };

exports.list = async (req, res) => {
  const { search, role, active } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (active !== undefined) where.active = active === 'true';

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: { code: { sort: 'asc', nulls: 'last' } },
  });

  res.json(users);
};

exports.get = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: userSelect,
  });

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
};

async function assertUniqueIdentifiers({ email, username }, excludeId) {
  if (email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (byEmail) return 'E-mail já cadastrado para outro usuário';
  }
  if (username) {
    const byUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (byUsername) return 'Nome de usuário já está em uso';
  }
  return null;
}

async function assertAccessGroupExists(accessGroupId) {
  if (!accessGroupId) return null;
  const group = await prisma.accessGroup.findUnique({ where: { id: accessGroupId } });
  if (!group) return 'Grupo de acesso não encontrado';
  return null;
}

// Impede que um administrador atribua a outro usuário um grupo de acesso com
// permissões que ele mesmo não possui (ETAPA 4.1/4.2 — vedar escalonamento
// de privilégios via reatribuição de grupo).
async function groupExceedsActorPermissions(accessGroupId, actorPermissions) {
  const group = await prisma.accessGroup.findUnique({
    where: { id: accessGroupId },
    include: { permissions: { include: { permission: true } } },
  });
  if (!group) return false;
  return group.permissions.some(gp => !actorPermissions.has(gp.permission.key));
}

exports.create = async (req, res) => {
  const { name, email, username, password, confirmPassword, role, accessGroupId } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'A confirmação de senha não corresponde' });
  }

  const requestedRole = role || 'CLIENT';
  // Ninguém pode criar um usuário com privilégio (role) superior ao seu próprio —
  // impede que um ADMIN comum crie um SUPER_ADMIN, por exemplo (ETAPA 4.2/4.3).
  if (ROLE_RANK[requestedRole] > ROLE_RANK[req.dbUser.role]) {
    return res.status(403).json({ error: 'Você não pode criar um usuário com privilégio superior ao seu' });
  }

  const dupError = await assertUniqueIdentifiers({ email, username });
  if (dupError) return res.status(409).json({ error: dupError });

  const groupError = await assertAccessGroupExists(accessGroupId);
  if (groupError) return res.status(400).json({ error: groupError });

  if (accessGroupId && req.dbUser.role !== 'SUPER_ADMIN') {
    const escalation = await groupExceedsActorPermissions(accessGroupId, req.permissions);
    if (escalation) return res.status(403).json({ error: 'Você não pode atribuir um grupo de acesso com permissões que você mesmo não possui' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name, email, username: username || null, password: hash,
      role: requestedRole,
      accessGroupId: accessGroupId || null,
    },
    select: userSelect,
  });

  await logAudit({
    actorId: req.dbUser.id, actorName: req.dbUser.name,
    action: 'user.create', resource: 'User', resourceId: user.id,
    metadata: { name, email, role: user.role, accessGroupId: user.accessGroupId },
  });

  res.status(201).json(user);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, username, role, active, accessGroupId } = req.body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  const isSelf = req.dbUser.id === id;
  const actorIsSuperAdmin = req.dbUser.role === 'SUPER_ADMIN';

  // Usuário comum não pode elevar os próprios privilégios (role/grupo).
  // Só SUPER_ADMIN pode alterar role/grupo de si mesmo.
  if (isSelf && !actorIsSuperAdmin && (role !== undefined || accessGroupId !== undefined)) {
    return res.status(403).json({ error: 'Você não pode alterar seu próprio perfil de acesso' });
  }

  // Um ADMIN comum não pode promover/alterar um SUPER_ADMIN global.
  if (target.role === 'SUPER_ADMIN' && !actorIsSuperAdmin) {
    return res.status(403).json({ error: 'Apenas o Super Admin pode alterar outro Super Admin' });
  }

  // Ninguém pode conceder um privilégio (role) superior ao seu próprio.
  if (role !== undefined && ROLE_RANK[role] > ROLE_RANK[req.dbUser.role]) {
    return res.status(403).json({ error: 'Você não pode conceder um privilégio superior ao seu' });
  }

  const dupError = await assertUniqueIdentifiers({ email, username }, id);
  if (dupError) return res.status(409).json({ error: dupError });

  if (accessGroupId !== undefined) {
    const groupError = await assertAccessGroupExists(accessGroupId);
    if (groupError) return res.status(400).json({ error: groupError });

    if (accessGroupId && !actorIsSuperAdmin) {
      const escalation = await groupExceedsActorPermissions(accessGroupId, req.permissions);
      if (escalation) return res.status(403).json({ error: 'Você não pode atribuir um grupo de acesso com permissões que você mesmo não possui' });
    }
  }

  // Proteção: não permitir desativar o último administrador ativo do sistema.
  const willDeactivate = active === false && target.active;
  const willDemote = role !== undefined && role !== target.role && ADMIN_ROLES.includes(target.role);
  if ((willDeactivate || willDemote) && ADMIN_ROLES.includes(target.role)) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: { in: ADMIN_ROLES }, active: true, NOT: { id } },
    });
    if (otherActiveAdmins === 0) {
      return res.status(409).json({ error: 'Não é possível desativar/alterar o último administrador do sistema' });
    }
  }

  // Desativação, mudança de role ou de grupo de acesso são alterações
  // críticas de autorização (ETAPA 3) — revogam qualquer token já emitido
  // para este usuário, forçando um novo login para que a mudança tenha
  // efeito imediato, mesmo que o token ainda não tenha expirado.
  const isCriticalAuthChange =
    (active === false && target.active) ||
    (role !== undefined && role !== target.role) ||
    (accessGroupId !== undefined && accessGroupId !== target.accessGroupId);

  const user = await prisma.user.update({
    where: { id },
    data: {
      name, email, username, role, active, accessGroupId,
      ...(isCriticalAuthChange && { tokenVersion: { increment: 1 } }),
    },
    select: userSelect,
  });

  // Revoga imediatamente o cache de status usado pelo middleware `auth`,
  // para que desativação/mudança de role tenha efeito já na próxima requisição.
  statusCache.invalidate(id);

  await logAudit({
    actorId: req.dbUser.id, actorName: req.dbUser.name,
    action: 'user.update', resource: 'User', resourceId: id,
    metadata: { name, email, role, active, accessGroupId },
  });

  res.json(user);
};

exports.checkLinks = async (req, res) => {
  const { id } = req.params;
  const [createdTickets, assignedTickets, comments] = await Promise.all([
    prisma.ticket.count({ where: { userId: id } }),
    prisma.ticket.count({ where: { assignedTo: id } }),
    prisma.ticketComment.count({ where: { userId: id } }),
  ]);
  res.json({ createdTickets, assignedTickets, comments });
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  if (req.dbUser.id === id) {
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (target.role === 'SUPER_ADMIN' && req.dbUser.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas o Super Admin pode excluir outro Super Admin' });
  }

  if (ADMIN_ROLES.includes(target.role)) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: { in: ADMIN_ROLES }, active: true, NOT: { id } },
    });
    if (otherActiveAdmins === 0) {
      return res.status(409).json({ error: 'Não é possível excluir o último administrador do sistema' });
    }
  }

  const [createdTickets, comments] = await Promise.all([
    prisma.ticket.count({ where: { userId: id } }),
    prisma.ticketComment.count({ where: { userId: id } }),
  ]);

  if (createdTickets > 0) {
    return res.status(409).json({
      error: `Usuário possui ${createdTickets} chamado(s) criado(s) e não pode ser excluído. Exclua ou transfira os chamados primeiro.`,
      createdTickets,
    });
  }

  if (comments > 0) {
    return res.status(409).json({
      error: `Usuário possui ${comments} comentário(s) em chamados e não pode ser excluído.`,
      comments,
    });
  }

  await prisma.$transaction([
    prisma.ticket.updateMany({ where: { assignedTo: id }, data: { assignedTo: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  statusCache.invalidate(id);

  await logAudit({ actorId: req.dbUser.id, actorName: req.dbUser.name, action: 'user.delete', resource: 'User', resourceId: id, metadata: { name: target.name, email: target.email } });
  res.json({ message: 'Usuário excluído com sucesso' });
};

exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const { password, confirmPassword } = req.body;
  if (!password) return res.status(400).json({ error: 'Nova senha é obrigatória' });
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'A confirmação de senha não corresponde' });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (target.role === 'SUPER_ADMIN' && req.dbUser.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Apenas o Super Admin pode redefinir a senha de outro Super Admin' });
  }

  const hash = await bcrypt.hash(password, 10);
  // Redefinição administrativa de senha revoga qualquer token já emitido
  // para este usuário (ETAPA 3) — o usuário precisa logar de novo com a
  // nova senha, inclusive se já estiver logado em outro dispositivo.
  await prisma.user.update({ where: { id }, data: { password: hash, tokenVersion: { increment: 1 } } });
  statusCache.invalidate(id);

  await logAudit({ actorId: req.dbUser.id, actorName: req.dbUser.name, action: 'user.reset_password', resource: 'User', resourceId: id });
  res.json({ message: 'Senha redefinida com sucesso' });
};

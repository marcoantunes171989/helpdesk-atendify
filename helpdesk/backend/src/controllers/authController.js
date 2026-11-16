const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const statusCache = require('../utils/userStatusCache');
const { isMissingColumnError } = require('../utils/schemaCompat');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function findUserForLogin(loginId) {
  try {
    return await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: loginId, mode: 'insensitive' } },
          { username: { equals: loginId, mode: 'insensitive' } },
        ],
      },
    });
  } catch (err) {
    if (!isMissingColumnError(err)) throw err;
    // Schema pré-RBAC: login apenas por e-mail, sem colunas username/accessGroupId/tokenVersion.
    const rows = await prisma.$queryRaw`
      SELECT id, code, name, email, password, role, active, "createdAt", "updatedAt"
      FROM users
      WHERE LOWER(email) = LOWER(${loginId})
      LIMIT 1
    `;
    const user = rows[0] || null;
    if (!user) return null;
    return {
      ...user,
      username: null,
      accessGroupId: null,
      tokenVersion: 0,
    };
  }
}

async function findUserProfile(userId) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, code: true, name: true, username: true, email: true,
        role: true, accessGroupId: true, active: true, createdAt: true, updatedAt: true,
      },
    });
  } catch (err) {
    if (!isMissingColumnError(err)) throw err;
    const rows = await prisma.$queryRaw`
      SELECT id, code, name, email, role, active, "createdAt", "updatedAt"
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = rows[0] || null;
    if (!user) return null;
    return { ...user, username: null, accessGroupId: null };
  }
}

exports.login = async (req, res) => {
  const { email, password, identifier } = req.body;
  const loginId = identifier || email;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Usuário/e-mail e senha são obrigatórios' });
  }

  const user = await findUserForLogin(loginId);

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = signToken(user);
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
};

exports.me = async (req, res) => {
  const user = await findUserProfile(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter ao menos 6 caracteres' });
  }
  if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'A confirmação da nova senha não corresponde' });
  }

  let user;
  try {
    user = await prisma.user.findUnique({ where: { id: req.user.id } });
  } catch (err) {
    if (!isMissingColumnError(err)) throw err;
    const rows = await prisma.$queryRaw`
      SELECT id, password FROM users WHERE id = ${req.user.id} LIMIT 1
    `;
    user = rows[0] || null;
  }
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Senha atual incorreta' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hash, tokenVersion: { increment: 1 } },
    });
  } catch (err) {
    if (!isMissingColumnError(err)) throw err;
    await prisma.$executeRaw`UPDATE users SET password = ${hash} WHERE id = ${req.user.id}`;
    updated = { id: req.user.id, role: req.user.role, name: req.user.name, email: req.user.email, tokenVersion: 0 };
  }
  statusCache.invalidate(req.user.id);

  const token = signToken(updated);
  res.json({ message: 'Senha alterada com sucesso', token });
};

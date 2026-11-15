const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const statusCache = require('../utils/userStatusCache');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.login = async (req, res) => {
  const { email, password, identifier } = req.body;
  const loginId = identifier || email;
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Usuário/e-mail e senha são obrigatórios' });
  }

  // Login por e-mail ou por nome de usuário, preservando compatibilidade
  // com os logins existentes (todos feitos por e-mail até aqui).
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: loginId, mode: 'insensitive' } },
        { username: { equals: loginId, mode: 'insensitive' } },
      ],
    },
  });

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Inclui name e email no payload para que o middleware não precise ir ao banco
  const token = signToken(user);

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
};

exports.me = async (req, res) => {
  // Busca dados completos apenas neste endpoint (chamado uma vez no boot do app)
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, code: true, name: true, username: true, email: true, role: true, accessGroupId: true, active: true, createdAt: true, updatedAt: true },
  });
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

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Senha atual incorreta' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  // Troca de senha revoga qualquer sessão/token emitido antes dela (ETAPA 3).
  // Um novo token já é emitido abaixo para que a própria sessão que fez a
  // troca não seja deslogada, apenas sessões antigas em outros dispositivos.
  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hash, tokenVersion: { increment: 1 } },
  });
  statusCache.invalidate(req.user.id);

  const token = signToken(updated);
  res.json({ message: 'Senha alterada com sucesso', token });
};

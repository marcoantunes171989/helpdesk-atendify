const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Inclui name e email no payload para que o middleware não precise ir ao banco
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
};

exports.me = async (req, res) => {
  // Busca dados completos apenas neste endpoint (chamado uma vez no boot do app)
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, code: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(user);
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Senha atual incorreta' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
  res.json({ message: 'Senha alterada com sucesso' });
};

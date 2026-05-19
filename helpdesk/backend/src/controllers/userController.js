const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const userSelect = {
  id: true, code: true, name: true, email: true,
  role: true, active: true, createdAt: true,
};

exports.list = async (req, res) => {
  const { search, role, active } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (active !== undefined) where.active = active === 'true';

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: { name: 'asc' },
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

exports.create = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: role || 'CLIENT' },
    select: userSelect,
  });

  res.status(201).json(user);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, active } = req.body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (email && email !== target.email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } },
    });
    if (byEmail) return res.status(409).json({ error: 'E-mail já cadastrado para outro usuário' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, role, active },
    select: userSelect,
  });

  res.json(user);
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  if (req.user.id === id) {
    return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  await prisma.user.delete({ where: { id } });
  res.json({ message: 'Usuário excluído com sucesso' });
};

exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Nova senha é obrigatória' });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { password: hash } });
  res.json({ message: 'Senha redefinida com sucesso' });
};

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, role, active, companyId } = req.query;
  const where = {};

  if (req.user.role === 'SUPER_ADMIN') {
    if (companyId) where.companyId = companyId;
  } else {
    where.companyId = req.user.companyId;
  }

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
    select: {
      id: true, name: true, email: true, role: true, active: true,
      companyId: true, createdAt: true,
    },
    orderBy: { name: 'asc' },
  });

  res.json(users);
};

exports.get = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      companyId: true, createdAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (req.user.role !== 'SUPER_ADMIN' && user.companyId !== req.user.companyId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  res.json(user);
};

exports.create = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const targetCompanyId = req.user.companyId;
  if (!targetCompanyId) return res.status(400).json({ error: 'Empresa não encontrada para o usuário logado' });

  if (req.user.role === 'ADMIN' && ['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return res.status(403).json({ error: 'Sem permissão para criar este perfil' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: role || 'CLIENT', companyId: targetCompanyId },
    select: { id: true, name: true, email: true, role: true, active: true, companyId: true, createdAt: true },
  });

  res.status(201).json(user);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, active } = req.body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (req.user.role !== 'SUPER_ADMIN' && target.companyId !== req.user.companyId) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { name, email, role, active },
    select: { id: true, name: true, email: true, role: true, active: true, companyId: true },
  });

  res.json(user);
};

exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Nova senha é obrigatória' });

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { password: hash } });
  res.json({ message: 'Senha redefinida com sucesso' });
};

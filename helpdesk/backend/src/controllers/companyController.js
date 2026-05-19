const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, active } = req.query;
  const where = {};

  if (req.user.role !== 'SUPER_ADMIN') {
    where.id = req.user.companyId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { cnpj: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (active !== undefined) {
    where.active = active === 'true';
  }

  const companies = await prisma.company.findMany({
    where,
    include: {
      _count: { select: { users: true, tickets: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(companies);
};

exports.get = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, tickets: true, categories: true } },
    },
  });

  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(company);
};

exports.create = async (req, res) => {
  const { name, cnpj, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes } = req.body;
  if (!name || !cnpj || !email) {
    return res.status(400).json({ error: 'Nome, CNPJ e email são obrigatórios' });
  }

  const existing = await prisma.company.findUnique({ where: { cnpj } });
  if (existing) return res.status(409).json({ error: 'CNPJ já cadastrado' });

  const company = await prisma.company.create({
    data: { name, cnpj, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes },
  });
  res.status(201).json(company);
};

exports.update = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { name, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes, active } = req.body;
  const company = await prisma.company.update({
    where: { id },
    data: { name, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes, active },
  });
  res.json(company);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await prisma.company.update({ where: { id }, data: { active: false } });
  res.json({ message: 'Empresa desativada com sucesso' });
};

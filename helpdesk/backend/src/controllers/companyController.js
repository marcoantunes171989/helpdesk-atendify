const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, active } = req.query;
  const where = {};

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
      _count: { select: { tickets: true, employees: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(companies);
};

exports.get = async (req, res) => {
  const { id } = req.params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { tickets: true, categories: true, employees: true } },
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

  const cnpjClean = cnpj.replace(/\D/g, '');

  const [byCnpj, byEmail, byPhone] = await Promise.all([
    prisma.company.findUnique({ where: { cnpj: cnpjClean } }),
    prisma.company.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),
    phone ? prisma.company.findFirst({ where: { phone: phone.replace(/\D/g, '') } }) : null,
  ]);

  if (byCnpj) return res.status(409).json({ error: 'CNPJ já cadastrado para outra empresa' });
  if (byEmail) return res.status(409).json({ error: 'E-mail já cadastrado para outra empresa' });
  if (byPhone) return res.status(409).json({ error: 'Telefone já cadastrado para outra empresa' });

  const company = await prisma.company.create({
    data: {
      name, cnpj: cnpjClean, stateRegistration, email,
      phone: phone ? phone.replace(/\D/g, '') : null,
      website,
      zipCode: zipCode ? zipCode.replace(/\D/g, '') : null,
      street, addressNumber, complement,
      neighborhood, city, state, notes,
    },
  });
  res.status(201).json(company);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes, active } = req.body;

  const [byEmail, byPhone] = await Promise.all([
    email ? prisma.company.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } } }) : null,
    phone ? prisma.company.findFirst({ where: { phone: phone.replace(/\D/g, ''), NOT: { id } } }) : null,
  ]);

  if (byEmail) return res.status(409).json({ error: 'E-mail já cadastrado para outra empresa' });
  if (byPhone) return res.status(409).json({ error: 'Telefone já cadastrado para outra empresa' });

  const company = await prisma.company.update({
    where: { id },
    data: {
      name, stateRegistration, email,
      phone: phone ? phone.replace(/\D/g, '') : null,
      website,
      zipCode: zipCode ? zipCode.replace(/\D/g, '') : null,
      street, addressNumber, complement,
      neighborhood, city, state, notes, active,
    },
  });
  res.json(company);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await prisma.company.update({ where: { id }, data: { active: false } });
  res.json({ message: 'Empresa desativada com sucesso' });
};

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
  if (active !== undefined) where.active = active === 'true';

  const companies = await prisma.company.findMany({
    where,
    include: { _count: { select: { tickets: true, employees: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(companies);
};

exports.get = async (req, res) => {
  const { id } = req.params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { tickets: true, categories: true, employees: true } } },
  });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(company);
};

exports.links = async (req, res) => {
  const { id } = req.params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, tickets: true, categories: true } } },
  });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json({
    name: company.name,
    employees: company._count.employees,
    tickets: company._count.tickets,
    categories: company._count.categories,
  });
};

exports.create = async (req, res) => {
  const { name, cnpj, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes } = req.body;

  if (!name || !cnpj || !email) {
    return res.status(400).json({ error: 'Nome, CNPJ e email são obrigatórios' });
  }

  const cnpjClean = cnpj.replace(/\D/g, '');
  const phoneClean = phone ? phone.replace(/\D/g, '') : null;
  const zipClean = zipCode ? zipCode.replace(/\D/g, '') : null;

  const [byCnpj, byEmail, byPhone] = await Promise.all([
    prisma.company.findUnique({ where: { cnpj: cnpjClean } }),
    prisma.company.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } }),
    phoneClean ? prisma.company.findFirst({ where: { phone: phoneClean } }) : null,
  ]);

  if (byCnpj) return res.status(409).json({ error: 'CNPJ já cadastrado para outra empresa' });
  if (byEmail) return res.status(409).json({ error: 'E-mail já cadastrado para outra empresa' });
  if (byPhone) return res.status(409).json({ error: 'Telefone já cadastrado para outra empresa' });

  const company = await prisma.company.create({
    data: { name, cnpj: cnpjClean, stateRegistration, email, phone: phoneClean, website, zipCode: zipClean, street, addressNumber, complement, neighborhood, city, state, notes },
  });
  res.status(201).json(company);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, cnpj, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes, active } = req.body;

  const cnpjClean = cnpj ? cnpj.replace(/\D/g, '') : undefined;
  const phoneClean = phone ? phone.replace(/\D/g, '') : null;
  const zipClean = zipCode ? zipCode.replace(/\D/g, '') : null;

  const [byEmail, byPhone, byCnpj] = await Promise.all([
    email ? prisma.company.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } } }) : null,
    phoneClean ? prisma.company.findFirst({ where: { phone: phoneClean, NOT: { id } } }) : null,
    cnpjClean ? prisma.company.findFirst({ where: { cnpj: cnpjClean, NOT: { id } } }) : null,
  ]);

  if (byCnpj) return res.status(409).json({ error: 'CNPJ já cadastrado para outra empresa' });
  if (byEmail) return res.status(409).json({ error: 'E-mail já cadastrado para outra empresa' });
  if (byPhone) return res.status(409).json({ error: 'Telefone já cadastrado para outra empresa' });

  const company = await prisma.company.update({
    where: { id },
    data: { name, cnpj: cnpjClean, stateRegistration, email, phone: phoneClean, website, zipCode: zipClean, street, addressNumber, complement, neighborhood, city, state, notes, active },
  });
  res.json(company);
};

exports.remove = async (req, res) => {
  const { id, force } = { ...req.params, ...req.query };

  const company = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, tickets: true, categories: true } } },
  });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  const hasLinks = company._count.employees > 0 || company._count.tickets > 0 || company._count.categories > 0;

  if (hasLinks && force !== 'true') {
    return res.status(409).json({
      error: 'Empresa possui registros vinculados',
      details: {
        employees: company._count.employees,
        tickets: company._count.tickets,
        categories: company._count.categories,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketComment.deleteMany({ where: { ticket: { companyId: id } } });
    await tx.ticket.deleteMany({ where: { companyId: id } });
    await tx.employee.deleteMany({ where: { companyId: id } });
    await tx.category.deleteMany({ where: { companyId: id } });
    await tx.company.delete({ where: { id } });
  });

  res.json({ message: 'Empresa excluída com sucesso' });
};

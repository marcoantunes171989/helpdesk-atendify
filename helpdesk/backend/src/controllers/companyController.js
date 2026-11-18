const prisma = require('../prisma');

// ETAPA 6 (RBAC-03): CNPJ, e-mail, telefone, endereço e observações são dados
// sensíveis da empresa-cliente. Quem não tem companies.read (ex.: CLIENT
// escolhendo a empresa ao abrir um chamado, ou AGENT sem o módulo) só recebe
// o necessário para preencher o formulário — sem expor dados sensíveis de
// outras empresas.
const PUBLIC_FIELDS = { id: true, code: true, name: true, fantasia: true, active: true };

function hasFullAccess(req) {
  return req.permissions?.has('companies.read');
}

exports.list = async (req, res) => {
  const { search, active } = req.query;
  const where = {};
  const full = hasFullAccess(req);

  if (search) {
    where.OR = full
      ? [
          { name: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      : [{ name: { contains: search, mode: 'insensitive' } }, { fantasia: { contains: search, mode: 'insensitive' } }];
  }
  if (active !== undefined) where.active = active === 'true';

  const companies = await prisma.company.findMany({
    where,
    ...(full
      ? { include: { _count: { select: { tickets: true, employees: true } } } }
      : { select: PUBLIC_FIELDS }),
    orderBy: { code: { sort: 'asc', nulls: 'last' } },
  });

  res.json(companies);
};

exports.get = async (req, res) => {
  const { id } = req.params;
  const full = hasFullAccess(req);
  const company = await prisma.company.findUnique({
    where: { id },
    ...(full
      ? { include: { _count: { select: { tickets: true, categories: true, employees: true } } } }
      : { select: PUBLIC_FIELDS }),
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
  const { name, fantasia, cnpj, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes } = req.body;

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
    data: { name, fantasia: fantasia || null, cnpj: cnpjClean, stateRegistration, email, phone: phoneClean, website, zipCode: zipClean, street, addressNumber, complement, neighborhood, city, state, notes },
  });
  res.status(201).json(company);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, fantasia, cnpj, stateRegistration, email, phone, website, zipCode, street, addressNumber, complement, neighborhood, city, state, notes, active } = req.body;

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
    data: { name, fantasia: fantasia ?? null, cnpj: cnpjClean, stateRegistration, email, phone: phoneClean, website, zipCode: zipClean, street, addressNumber, complement, neighborhood, city, state, notes, active },
  });
  res.json(company);
};

const companyUserSelect = { id: true, name: true, email: true, role: true };

async function listCompanyUsers(companyId) {
  const links = await prisma.companyUserAccess.findMany({
    where: { companyId },
    include: { user: { select: companyUserSelect } },
    orderBy: { createdAt: 'asc' },
  });
  return links.map(link => link.user);
}

exports.listUserAccess = async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(await listCompanyUsers(company.id));
};

exports.addUserAccess = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Selecione um usuário' });

  const company = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, active: true } });
  if (!user || !user.active) return res.status(400).json({ error: 'Usuário não encontrado ou inativo' });

  try {
    await prisma.companyUserAccess.create({ data: { companyId: id, userId } });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Usuário já vinculado a esta empresa' });
    throw err;
  }

  res.status(201).json(await listCompanyUsers(id));
};

exports.removeUserAccess = async (req, res) => {
  const { id, userId } = req.params;
  const company = await prisma.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

  await prisma.companyUserAccess.deleteMany({ where: { companyId: id, userId } });
  res.json(await listCompanyUsers(id));
};

exports.remove = async (req, res) => {
  const { id, force } = { ...req.params, ...req.query };

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { employees: true, tickets: true, categories: true } } },
    });
    if (!company) return res.status(404).json({ error: 'Empresa não encontrada' });

    const hasLinks =
      company._count.employees > 0 ||
      company._count.tickets > 0 ||
      company._count.categories > 0;

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
  } catch (err) {
    console.error('Erro ao excluir empresa:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir empresa' });
  }
};

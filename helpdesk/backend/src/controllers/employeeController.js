const prisma = require('../prisma');

exports.list = async (req, res) => {
  const { search, active, companyId } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
      { company: { fantasia: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (active !== undefined) where.active = active === 'true';
  if (companyId) where.companyId = companyId;

  const employees = await prisma.employee.findMany({
    where,
    include: { company: { select: { id: true, name: true, fantasia: true } } },
    orderBy: { code: { sort: 'asc', nulls: 'last' } },
  });

  res.json(employees);
};

exports.get = async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { company: { select: { id: true, name: true, fantasia: true } } },
  });

  if (!employee) return res.status(404).json({ error: 'Funcionário não encontrado' });
  res.json(employee);
};

exports.create = async (req, res) => {
  const { name, phone, position, companyId } = req.body;

  if (!name || !position) {
    return res.status(400).json({ error: 'Nome e cargo são obrigatórios' });
  }

  const targetCompanyId = companyId || req.user.companyId;
  if (!targetCompanyId) return res.status(400).json({ error: 'Empresa é obrigatória' });

  const employee = await prisma.employee.create({
    data: {
      name,
      phone: phone || null,
      position,
      companyId: targetCompanyId,
    },
    include: { company: { select: { id: true, name: true, fantasia: true } } },
  });

  res.status(201).json(employee);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, phone, position, active } = req.body;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const data = { name, phone: phone || null, position };
  if (active !== undefined) data.active = active;

  const employee = await prisma.employee.update({
    where: { id },
    data,
    include: { company: { select: { id: true, name: true, fantasia: true } } },
  });

  res.json(employee);
};

exports.checkLinks = async (req, res) => {
  const tickets = await prisma.ticket.count({ where: { employeeId: req.params.id } });
  res.json({ tickets });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const ticketCount = await prisma.ticket.count({ where: { employeeId: id } });
  await prisma.$transaction([
    ...(ticketCount > 0
      ? [prisma.ticket.updateMany({ where: { employeeId: id }, data: { employeeId: null } })]
      : []),
    prisma.employee.delete({ where: { id } }),
  ]);
  res.json({ message: 'Funcionário excluído com sucesso', unlinkedTickets: ticketCount });
};

exports.departments = async (req, res) => {
  res.json([]);
};

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, active } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (active !== undefined) where.active = active === 'true';

  const employees = await prisma.employee.findMany({
    where,
    include: { company: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });

  res.json(employees);
};

exports.get = async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: { company: { select: { id: true, name: true } } },
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
    include: { company: { select: { id: true, name: true } } },
  });

  res.status(201).json(employee);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, phone, position } = req.body;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const employee = await prisma.employee.update({
    where: { id },
    data: { name, phone: phone || null, position },
    include: { company: { select: { id: true, name: true } } },
  });

  res.json(employee);
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  await prisma.employee.delete({ where: { id } });
  res.json({ message: 'Funcionário excluído com sucesso' });
};

exports.departments = async (req, res) => {
  res.json([]);
};

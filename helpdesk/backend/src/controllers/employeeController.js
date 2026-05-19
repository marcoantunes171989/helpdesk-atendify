const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, department, active } = req.query;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { cpf: { contains: search } },
      { position: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (department) where.department = department;
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
  const { name, email, phone, cpf, position, department, salary, hireDate, companyId } = req.body;

  if (!name || !position) {
    return res.status(400).json({ error: 'Nome e cargo são obrigatórios' });
  }

  const targetCompanyId = companyId || req.user.companyId;
  if (!targetCompanyId) return res.status(400).json({ error: 'Empresa é obrigatória' });

  if (email) {
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });
  }

  if (cpf) {
    const existing = await prisma.employee.findUnique({ where: { cpf } });
    if (existing) return res.status(409).json({ error: 'CPF já cadastrado' });
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      cpf: cpf || null,
      position,
      department: department || null,
      salary: salary ? parseFloat(salary) : null,
      hireDate: hireDate ? new Date(hireDate) : null,
      companyId: targetCompanyId,
    },
    include: { company: { select: { id: true, name: true } } },
  });

  res.status(201).json(employee);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, cpf, position, department, salary, hireDate, active } = req.body;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      cpf: cpf || null,
      position,
      department: department || null,
      salary: salary ? parseFloat(salary) : null,
      hireDate: hireDate ? new Date(hireDate) : null,
      active,
    },
    include: { company: { select: { id: true, name: true } } },
  });

  res.json(employee);
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  await prisma.employee.update({ where: { id }, data: { active: false } });
  res.json({ message: 'Funcionário desativado com sucesso' });
};

exports.departments = async (req, res) => {
  const result = await prisma.employee.findMany({
    where: { department: { not: null }, active: true },
    select: { department: true },
    distinct: ['department'],
    orderBy: { department: 'asc' },
  });

  res.json(result.map(r => r.department).filter(Boolean));
};

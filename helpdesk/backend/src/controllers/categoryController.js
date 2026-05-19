const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const companyId = req.user.role === 'SUPER_ADMIN'
    ? req.query.companyId
    : req.user.companyId;

  const where = companyId ? { companyId } : {};

  const categories = await prisma.category.findMany({
    where,
    include: {
      company: { select: { name: true } },
      _count: { select: { tickets: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json(categories);
};

exports.get = async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: { company: { select: { name: true } } },
  });

  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json(category);
};

exports.create = async (req, res) => {
  const { name, description, slaHours, companyId } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const targetCompanyId = req.user.role === 'SUPER_ADMIN' ? companyId : req.user.companyId;

  const category = await prisma.category.create({
    data: { name, description, slaHours: slaHours || 24, companyId: targetCompanyId },
  });

  res.status(201).json(category);
};

exports.update = async (req, res) => {
  const { name, description, slaHours } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, description, slaHours },
  });
  res.json(category);
};

exports.remove = async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Categoria removida com sucesso' });
};

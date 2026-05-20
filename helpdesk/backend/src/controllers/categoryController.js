const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';

  const categories = await prisma.category.findMany({
    where,
    include: { _count: { select: { tickets: true } } },
    orderBy: { code: { sort: 'asc', nulls: 'last' } },
  });
  res.json(categories);
};

exports.get = async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
  });
  if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.json(category);
};

exports.create = async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return res.status(409).json({ error: 'Já existe uma categoria com este nome' });

  const last = await prisma.category.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;

  const category = await prisma.category.create({
    data: { name, description, code },
  });
  res.status(201).json(category);
};

exports.update = async (req, res) => {
  const { name, description, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, NOT: { id: req.params.id } },
  });
  if (existing) return res.status(409).json({ error: 'Já existe uma categoria com este nome' });

  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, description, active },
  });
  res.json(category);
};

exports.remove = async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Categoria removida com sucesso' });
};

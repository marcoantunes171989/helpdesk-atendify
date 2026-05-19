const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { tickets: true } } },
    orderBy: { name: 'asc' },
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

  const category = await prisma.category.create({
    data: { name, description },
  });
  res.status(201).json(category);
};

exports.update = async (req, res) => {
  const { name, description } = req.body;
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name, description },
  });
  res.json(category);
};

exports.remove = async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ message: 'Categoria removida com sucesso' });
};

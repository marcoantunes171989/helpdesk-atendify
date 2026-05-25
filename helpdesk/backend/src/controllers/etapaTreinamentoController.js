const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, category, active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }
  const items = await prisma.etapaTreinamento.findMany({
    where,
    orderBy: [{ category: 'asc' }, { order: 'asc' }, { title: 'asc' }],
  });
  res.json(items);
};

exports.get = async (req, res) => {
  const item = await prisma.etapaTreinamento.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json(item);
};

exports.create = async (req, res) => {
  const { title, description, category, order, active } = req.body;
  const item = await prisma.etapaTreinamento.create({
    data: { title, description: description || null, category: category || null, order: order ? Number(order) : null, active: active !== false },
  });
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const { title, description, category, order, active } = req.body;
  const item = await prisma.etapaTreinamento.update({
    where: { id: req.params.id },
    data: { title, description: description || null, category: category || null, order: order ? Number(order) : null, active },
  });
  res.json(item);
};

exports.remove = async (req, res) => {
  await prisma.etapaTreinamento.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

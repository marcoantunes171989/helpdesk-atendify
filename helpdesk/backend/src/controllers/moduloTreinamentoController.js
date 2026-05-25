const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { search, active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  const items = await prisma.moduloTreinamento.findMany({
    where,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { etapas: true } } },
  });
  res.json(items);
};

exports.get = async (req, res) => {
  const item = await prisma.moduloTreinamento.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Módulo não encontrado' });
  res.json(item);
};

exports.create = async (req, res) => {
  const { name, description, order, active } = req.body;
  const item = await prisma.moduloTreinamento.create({
    data: { name, description: description || null, order: order ? Number(order) : null, active: active !== false },
  });
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const { name, description, order, active } = req.body;
  const item = await prisma.moduloTreinamento.update({
    where: { id: req.params.id },
    data: { name, description: description || null, order: order ? Number(order) : null, active },
  });
  res.json(item);
};

exports.remove = async (req, res) => {
  await prisma.moduloTreinamento.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

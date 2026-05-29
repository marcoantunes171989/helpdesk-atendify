const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';

  const statuses = await prisma.ticketStatusRef.findMany({
    where,
    include: { _count: { select: { tickets: true } } },
    orderBy: { code: 'asc' },
  });
  res.json(statuses);
};

exports.get = async (req, res) => {
  const status = await prisma.ticketStatusRef.findUnique({
    where: { id: req.params.id },
  });
  if (!status) return res.status(404).json({ error: 'Status não encontrado' });
  res.json(status);
};

exports.create = async (req, res) => {
  const { name, description, observation, color, builtinStatus } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const last = await prisma.ticketStatusRef.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;

  const status = await prisma.ticketStatusRef.create({
    data: { code, name, description, observation, color: color || '#6b7280', builtinStatus: builtinStatus || null },
  });
  res.status(201).json(status);
};

exports.update = async (req, res) => {
  const { name, description, observation, color, active, builtinStatus } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  const status = await prisma.ticketStatusRef.update({
    where: { id: req.params.id },
    data: { name, description, observation, color, active, builtinStatus: builtinStatus || null },
  });
  res.json(status);
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  const linked = await prisma.ticket.count({ where: { statusId: id } });
  if (linked > 0) {
    return res.status(409).json({ error: `Este status está vinculado a ${linked} chamado(s) e não pode ser removido` });
  }

  await prisma.ticketStatusRef.delete({ where: { id } });
  res.json({ message: 'Status removido com sucesso' });
};

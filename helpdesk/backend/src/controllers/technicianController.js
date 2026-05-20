const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { active, search } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const technicians = await prisma.technician.findMany({
    where,
    include: { _count: { select: { tickets: true } } },
    orderBy: { code: { sort: 'asc', nulls: 'last' } },
  });
  res.json(technicians);
};

exports.get = async (req, res) => {
  const technician = await prisma.technician.findUnique({ where: { id: req.params.id } });
  if (!technician) return res.status(404).json({ error: 'Tecnico nao encontrado' });
  res.json(technician);
};

exports.create = async (req, res) => {
  const { name, description, observation } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome e obrigatorio' });

  const last = await prisma.technician.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;

  const technician = await prisma.technician.create({
    data: { code, name, description, observation },
  });
  res.status(201).json(technician);
};

exports.update = async (req, res) => {
  const { name, description, observation, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome e obrigatorio' });

  const technician = await prisma.technician.update({
    where: { id: req.params.id },
    data: { name, description, observation, active },
  });
  res.json(technician);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const linked = await prisma.ticket.count({ where: { technicianId: id } });
  if (linked > 0) {
    return res.status(409).json({ error: `Este tecnico esta vinculado a ${linked} chamado(s) e nao pode ser removido` });
  }
  await prisma.technician.delete({ where: { id } });
  res.json({ message: 'Tecnico removido com sucesso' });
};

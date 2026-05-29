const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const include = { modulo: { select: { id: true, name: true } } };

exports.list = async (req, res) => {
  const { search, moduloId, active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (moduloId) where.moduloId = moduloId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { modulo: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const items = await prisma.etapaTreinamento.findMany({
    where,
    include,
    orderBy: [{ modulo: { order: 'asc' } }, { order: 'asc' }, { title: 'asc' }],
  });
  res.json(items);
};

exports.get = async (req, res) => {
  const item = await prisma.etapaTreinamento.findUnique({ where: { id: req.params.id }, include });
  if (!item) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json(item);
};

async function nextOrder() {
  const last = await prisma.etapaTreinamento.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  return (last?.order ?? 0) + 1;
}

exports.create = async (req, res) => {
  const { title, description, moduloId, active } = req.body;
  const order = await nextOrder();
  const item = await prisma.etapaTreinamento.create({
    data: {
      title,
      description: description || null,
      moduloId: moduloId || null,
      order,
      active: active !== false,
    },
    include,
  });
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const { title, description, moduloId, active } = req.body;
  const item = await prisma.etapaTreinamento.update({
    where: { id: req.params.id },
    data: {
      title,
      description: description || null,
      moduloId: moduloId || null,
      active,
    },
    include,
  });
  res.json(item);
};

exports.remove = async (req, res) => {
  await prisma.etapaTreinamento.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

const prisma = require('../prisma');

const include = {
  company: { select: { id: true, name: true, fantasia: true } },
  trainer: { select: { id: true, name: true, email: true } },
  participantes: {
    include: { employee: { select: { id: true, name: true, position: true } } },
  },
};

async function nextCode() {
  const last = await prisma.treinamento.findFirst({ orderBy: { code: 'desc' }, select: { code: true } });
  return (last?.code ?? 0) + 1;
}

exports.list = async (req, res) => {
  const { search, status, tipo, companyId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;
  if (companyId) where.companyId = companyId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const items = await prisma.treinamento.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json(items);
};

exports.get = async (req, res) => {
  const item = await prisma.treinamento.findUnique({ where: { id: req.params.id }, include });
  if (!item) return res.status(404).json({ error: 'Treinamento não encontrado' });
  res.json(item);
};

exports.create = async (req, res) => {
  const { participantes = [], ...data } = req.body;
  const code = await nextCode();
  const item = await prisma.treinamento.create({
    data: {
      ...data,
      code,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      participantes: {
        create: participantes.map(p => ({
          employeeId: p.employeeId || null,
          name: p.name || null,
          email: p.email || null,
          attended: p.attended ?? false,
        })),
      },
    },
    include,
  });
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const { participantes, ...data } = req.body;

  const payload = {
    ...data,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
  };

  if (data.status === 'CONCLUIDO' && !data.completedAt) payload.completedAt = new Date();
  if (data.status && data.status !== 'CONCLUIDO') payload.completedAt = null;

  if (participantes !== undefined) {
    await prisma.treinamentoParticipante.deleteMany({ where: { treinamentoId: req.params.id } });
    payload.participantes = {
      create: participantes.map(p => ({
        employeeId: p.employeeId || null,
        name: p.name || null,
        email: p.email || null,
        attended: p.attended ?? false,
      })),
    };
  }

  const item = await prisma.treinamento.update({ where: { id: req.params.id }, data: payload, include });
  res.json(item);
};

exports.updateParticipante = async (req, res) => {
  const { participanteId } = req.params;
  const p = await prisma.treinamentoParticipante.update({ where: { id: participanteId }, data: req.body });
  res.json(p);
};

exports.remove = async (req, res) => {
  await prisma.treinamentoParticipante.deleteMany({ where: { treinamentoId: req.params.id } });
  await prisma.treinamento.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

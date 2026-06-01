const prisma = require('../prisma');

const include = {
  company: { select: { id: true, name: true, fantasia: true, city: true, state: true } },
  responsible: { select: { id: true, name: true, email: true } },
  technician: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true, position: true } },
  fases: { orderBy: { order: 'asc' } },
};

async function nextCode() {
  const last = await prisma.implantacao.findFirst({ orderBy: { code: 'desc' }, select: { code: true } });
  return (last?.code ?? 0) + 1;
}

function parseFases(fases = []) {
  return fases.map(f => ({
    ...f,
    employeeIds: f.employeeIds ? JSON.parse(f.employeeIds) : [],
  }));
}

exports.list = async (req, res) => {
  const { search, status, companyId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  const items = await prisma.implantacao.findMany({ where, include, orderBy: { createdAt: 'desc' } });
  res.json(items.map(i => ({ ...i, fases: parseFases(i.fases) })));
};

exports.get = async (req, res) => {
  const item = await prisma.implantacao.findUnique({ where: { id: req.params.id }, include });
  if (!item) return res.status(404).json({ error: 'Implantação não encontrada' });
  res.json({ ...item, fases: parseFases(item.fases) });
};

exports.create = async (req, res) => {
  const { fases = [], ...data } = req.body;
  const code = await nextCode();
  const item = await prisma.implantacao.create({
    data: {
      ...data,
      code,
      startDate: data.startDate ? new Date(data.startDate) : null,
      expectedEnd: data.expectedEnd ? new Date(data.expectedEnd) : null,
      fases: {
        create: fases.map((f, i) => ({
          order: f.order ?? i + 1,
          title: f.title,
          description: f.description || null,
          status: f.status || 'PENDENTE',
          employeeIds: JSON.stringify(f.employeeIds || []),
          etapaTreinamentoId: f.etapaTreinamentoId || null,
        })),
      },
    },
    include,
  });
  res.status(201).json({ ...item, fases: parseFases(item.fases) });
};

exports.update = async (req, res) => {
  const { fases, ...data } = req.body;

  const payload = {
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : null,
    expectedEnd: data.expectedEnd ? new Date(data.expectedEnd) : null,
  };

  if (data.status === 'CONCLUIDO' && !data.completedAt) payload.completedAt = new Date();
  if (data.status && data.status !== 'CONCLUIDO') payload.completedAt = null;

  if (fases !== undefined) {
    await prisma.implantacaoFase.deleteMany({ where: { implantacaoId: req.params.id } });
    payload.fases = {
      create: fases.map((f, i) => ({
        order: f.order ?? i + 1,
        title: f.title,
        description: f.description || null,
        status: f.status || 'PENDENTE',
        employeeIds: JSON.stringify(f.employeeIds || []),
        etapaTreinamentoId: f.etapaTreinamentoId || null,
        completedAt: f.completedAt ? new Date(f.completedAt) : null,
      })),
    };
  }

  const item = await prisma.implantacao.update({ where: { id: req.params.id }, data: payload, include });
  res.json({ ...item, fases: parseFases(item.fases) });
};

exports.updateFase = async (req, res) => {
  const { id, faseId } = req.params;
  const data = req.body;
  if (data.status === 'CONCLUIDO') data.completedAt = new Date();
  if (data.status && data.status !== 'CONCLUIDO') data.completedAt = null;
  const fase = await prisma.implantacaoFase.update({ where: { id: faseId }, data });

  // auto-update implantacao status based on fases
  const allFases = await prisma.implantacaoFase.findMany({ where: { implantacaoId: id } });
  if (allFases.length > 0) {
    const allDone = allFases.every(f => f.status === 'CONCLUIDO');
    const anyInProgress = allFases.some(f => f.status === 'EM_ANDAMENTO');
    const parent = await prisma.implantacao.findUnique({ where: { id }, select: { status: true } });
    if (allDone && parent.status !== 'CONCLUIDO') {
      await prisma.implantacao.update({ where: { id }, data: { status: 'CONCLUIDO', completedAt: new Date() } });
    } else if (anyInProgress && parent.status === 'PENDENTE') {
      await prisma.implantacao.update({ where: { id }, data: { status: 'EM_ANDAMENTO' } });
    }
  }
  res.json(fase);
};

exports.remove = async (req, res) => {
  await prisma.implantacaoFase.deleteMany({ where: { implantacaoId: req.params.id } });
  await prisma.implantacao.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

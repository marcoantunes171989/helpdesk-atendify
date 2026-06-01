const prisma = require('../prisma');

const include = {
  company:    { select: { id: true, name: true, fantasia: true } },
  technician: { select: { id: true, name: true } },
  employee:   { select: { id: true, name: true, position: true } },
  createdBy:  { select: { id: true, name: true } },
};

exports.list = async (req, res) => {
  const { companyId, status } = req.query;
  const where = {};
  if (companyId) where.companyId = companyId;
  if (status)    where.status = status;
  const data = await prisma.visita.findMany({ where, include, orderBy: { visitDate: 'desc' } });
  res.json(data);
};

exports.get = async (req, res) => {
  const item = await prisma.visita.findUnique({ where: { id: req.params.id }, include });
  if (!item) return res.status(404).json({ error: 'Visita não encontrada' });
  res.json(item);
};

exports.create = async (req, res) => {
  const {
    title, companyId, technicianId, employeeId, visitDate, status,
    objectives, topicConfig, topicConfigDesc,
    topicTreino, topicTreinoDesc, topicTreinoMods,
    topicOutros, topicOutrosDesc,
    conclusions, nextSteps,
  } = req.body;
  const item = await prisma.visita.create({
    data: {
      title, companyId,
      technicianId: technicianId || null,
      employeeId:   employeeId   || null,
      visitDate:    new Date(visitDate),
      status:       status || 'REALIZADA',
      objectives,
      topicConfig:     !!topicConfig,
      topicConfigDesc: topicConfigDesc || null,
      topicTreino:     !!topicTreino,
      topicTreinoDesc: topicTreinoDesc || null,
      topicTreinoMods: topicTreinoMods || null,
      topicOutros:     !!topicOutros,
      topicOutrosDesc: topicOutrosDesc || null,
      conclusions,
      nextSteps,
      createdById: req.user.id,
    },
    include,
  });
  res.status(201).json(item);
};

exports.update = async (req, res) => {
  const {
    title, companyId, technicianId, employeeId, visitDate, status,
    objectives, topicConfig, topicConfigDesc,
    topicTreino, topicTreinoDesc, topicTreinoMods,
    topicOutros, topicOutrosDesc,
    conclusions, nextSteps,
  } = req.body;
  const item = await prisma.visita.update({
    where: { id: req.params.id },
    data: {
      title, companyId,
      technicianId: technicianId || null,
      employeeId:   employeeId   || null,
      visitDate:    visitDate ? new Date(visitDate) : undefined,
      status,
      objectives,
      topicConfig:     topicConfig !== undefined ? !!topicConfig : undefined,
      topicConfigDesc: topicConfigDesc ?? null,
      topicTreino:     topicTreino !== undefined ? !!topicTreino : undefined,
      topicTreinoDesc: topicTreinoDesc ?? null,
      topicTreinoMods: topicTreinoMods ?? null,
      topicOutros:     topicOutros !== undefined ? !!topicOutros : undefined,
      topicOutrosDesc: topicOutrosDesc ?? null,
      conclusions,
      nextSteps,
    },
    include,
  });
  res.json(item);
};

exports.remove = async (req, res) => {
  await prisma.visita.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const include = { state: { select: { id: true, name: true, sigla: true } } };

exports.list = async (req, res) => {
  const { search, stateId, active } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (stateId) where.stateId = stateId;
  if (search) where.name = { contains: search, mode: 'insensitive' };
  const cities = await prisma.city.findMany({
    where,
    include,
    orderBy: [{ state: { sigla: 'asc' } }, { name: 'asc' }],
  });
  res.json(cities);
};

exports.get = async (req, res) => {
  const city = await prisma.city.findUnique({ where: { id: req.params.id }, include });
  if (!city) return res.status(404).json({ error: 'Cidade não encontrada' });
  res.json(city);
};

exports.create = async (req, res) => {
  const { name, ibgeCode, stateId } = req.body;
  if (!name || !stateId) return res.status(400).json({ error: 'Nome e estado são obrigatórios' });

  const last = await prisma.city.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;

  const city = await prisma.city.create({
    data: { name, ibgeCode: ibgeCode ? parseInt(ibgeCode) : null, stateId, code },
    include,
  });
  res.status(201).json(city);
};

exports.update = async (req, res) => {
  const { name, ibgeCode, stateId, active } = req.body;
  if (!name || !stateId) return res.status(400).json({ error: 'Nome e estado são obrigatórios' });

  const city = await prisma.city.update({
    where: { id: req.params.id },
    data: { name, ibgeCode: ibgeCode ? parseInt(ibgeCode) : null, stateId, active },
    include,
  });
  res.json(city);
};

exports.remove = async (req, res) => {
  await prisma.city.delete({ where: { id: req.params.id } });
  res.json({ message: 'Cidade removida com sucesso' });
};

exports.removeAll = async (req, res) => {
  const { count } = await prisma.city.deleteMany({});
  res.json({ message: `${count} cidade(s) removida(s) com sucesso`, count });
};

exports.importFromIbge = async (req, res) => {
  const { cities } = req.body;
  if (!cities?.length) return res.status(400).json({ error: 'Nenhuma cidade enviada' });

  const states = await prisma.state.findMany({ select: { id: true, sigla: true } });
  const stateMap = Object.fromEntries(states.map(s => [s.sigla, s.id]));

  let created = 0, skipped = 0, noState = 0;

  for (const c of cities) {
    const stateId = stateMap[c.stateSigla];
    if (!stateId) { noState++; continue; }

    if (c.ibgeCode) {
      const exists = await prisma.city.findUnique({ where: { ibgeCode: parseInt(c.ibgeCode) } });
      if (exists) { skipped++; continue; }
    }

    const last = await prisma.city.findFirst({ orderBy: { code: 'desc' } });
    await prisma.city.create({
      data: {
        name: c.name,
        ibgeCode: c.ibgeCode ? parseInt(c.ibgeCode) : null,
        stateId,
        code: (last?.code ?? 0) + 1,
      },
    });
    created++;
  }

  const msg = `${created} cidade(s) importada(s), ${skipped} já existia(m)${noState > 0 ? `, ${noState} sem estado correspondente` : ''}.`;
  res.json({ message: msg, created, skipped, noState });
};

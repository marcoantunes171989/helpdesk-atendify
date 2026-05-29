const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.list = async (req, res) => {
  const { active, search } = req.query;
  const where = {};
  if (active !== undefined) where.active = active === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sigla: { contains: search, mode: 'insensitive' } },
    ];
  }
  const states = await prisma.state.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json(states);
};

exports.get = async (req, res) => {
  const state = await prisma.state.findUnique({ where: { id: req.params.id } });
  if (!state) return res.status(404).json({ error: 'Estado não encontrado' });
  res.json(state);
};

exports.create = async (req, res) => {
  const { name, sigla, ibgeCode, region } = req.body;
  if (!name || !sigla) return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });

  const existing = await prisma.state.findFirst({
    where: { sigla: { equals: sigla.toUpperCase(), mode: 'insensitive' } },
  });
  if (existing) return res.status(409).json({ error: 'Já existe um estado com esta sigla' });

  const last = await prisma.state.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;

  const state = await prisma.state.create({
    data: { name, sigla: sigla.toUpperCase(), ibgeCode: ibgeCode ? parseInt(ibgeCode) : null, region: region || null, code },
  });
  res.status(201).json(state);
};

exports.update = async (req, res) => {
  const { name, sigla, ibgeCode, region, active } = req.body;
  if (!name || !sigla) return res.status(400).json({ error: 'Nome e sigla são obrigatórios' });

  const existing = await prisma.state.findFirst({
    where: { sigla: { equals: sigla.toUpperCase(), mode: 'insensitive' }, NOT: { id: req.params.id } },
  });
  if (existing) return res.status(409).json({ error: 'Já existe um estado com esta sigla' });

  const state = await prisma.state.update({
    where: { id: req.params.id },
    data: { name, sigla: sigla.toUpperCase(), ibgeCode: ibgeCode ? parseInt(ibgeCode) : null, region: region || null, active },
  });
  res.json(state);
};

exports.checkLinks = async (req, res) => {
  const cities = await prisma.city.count({ where: { stateId: req.params.id } });
  res.json({ cities });
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  const cityCount = await prisma.city.count({ where: { stateId: id } });
  await prisma.$transaction([
    prisma.city.deleteMany({ where: { stateId: id } }),
    prisma.state.delete({ where: { id } }),
  ]);
  res.json({ message: 'Estado removido com sucesso', deletedCities: cityCount });
};

exports.removeAll = async (req, res) => {
  await prisma.city.deleteMany({});
  const { count } = await prisma.state.deleteMany({});
  res.json({ message: `${count} estado(s) e todas as cidades removidos com sucesso`, count });
};

exports.importFromIbge = async (req, res) => {
  const { states } = req.body;
  if (!states?.length) return res.status(400).json({ error: 'Nenhum estado enviado' });

  let created = 0;
  let skipped = 0;

  for (const s of states) {
    const existing = await prisma.state.findFirst({
      where: { sigla: { equals: s.sigla, mode: 'insensitive' } },
    });
    if (existing) { skipped++; continue; }

    const last = await prisma.state.findFirst({ orderBy: { code: 'desc' } });
    const code = (last?.code ?? 0) + 1;

    await prisma.state.create({
      data: {
        name: s.name,
        sigla: s.sigla.toUpperCase(),
        ibgeCode: s.ibgeCode ? parseInt(s.ibgeCode) : null,
        region: s.region || null,
        code,
      },
    });
    created++;
  }

  res.json({ message: `${created} estado(s) importado(s), ${skipped} já existia(m).`, created, skipped });
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Visitas ──────────────────────────────────────────────────────────────────

exports.listVisitas = async (req, res) => {
  try {
    const { mes, tecnico } = req.query;
    const where = {};
    if (mes)     where.mes     = mes;
    if (tecnico) where.tecnico = { contains: tecnico, mode: 'insensitive' };
    const data = await prisma.agendaVisita.findMany({
      where,
      orderBy: [{ data: 'asc' }, { tecnico: 'asc' }],
    });
    res.json(data);
  } catch (err) {
    console.error('listVisitas error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.createVisita = async (req, res) => {
  try {
    const { tecnico, cliente, tipo, data, mes, obs } = req.body;
    if (!tecnico || !cliente) return res.status(400).json({ error: 'tecnico e cliente são obrigatórios' });
    const item = await prisma.agendaVisita.create({ data: { tecnico, cliente, tipo, data, mes, obs } });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateVisita = async (req, res) => {
  try {
    const { tecnico, cliente, tipo, data, mes, obs } = req.body;
    const item = await prisma.agendaVisita.update({
      where: { id: req.params.id },
      data: { tecnico, cliente, tipo, data, mes, obs },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeVisita = async (req, res) => {
  try {
    await prisma.agendaVisita.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Plantões ─────────────────────────────────────────────────────────────────

exports.listPlantoes = async (req, res) => {
  try {
    const { aba, tecnico } = req.query;
    const where = {};
    if (aba)     where.aba     = aba;
    if (tecnico) where.tecnico = { contains: tecnico, mode: 'insensitive' };
    const data = await prisma.agendaPlantao.findMany({ where, orderBy: { data: 'asc' } });
    res.json(data);
  } catch (err) {
    console.error('listPlantoes error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.createPlantao = async (req, res) => {
  try {
    const { data, tecnico, tipo, aba } = req.body;
    if (!tecnico) return res.status(400).json({ error: 'tecnico é obrigatório' });
    const item = await prisma.agendaPlantao.create({ data: { data, tecnico, tipo, aba } });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlantao = async (req, res) => {
  try {
    const { data, tecnico, tipo, aba } = req.body;
    const item = await prisma.agendaPlantao.update({
      where: { id: req.params.id },
      data: { data, tecnico, tipo, aba },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removePlantao = async (req, res) => {
  try {
    await prisma.agendaPlantao.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Férias ──────────────────────────────────────────────────────────────────

exports.listFerias = async (req, res) => {
  try {
    const { tipo, colaborador } = req.query;
    const where = {};
    if (tipo)        where.tipo        = tipo;
    if (colaborador) where.colaborador = { contains: colaborador, mode: 'insensitive' };
    const data = await prisma.agendaFerias.findMany({ where, orderBy: { colaborador: 'asc' } });
    res.json(data);
  } catch (err) {
    console.error('listFerias error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.createFerias = async (req, res) => {
  try {
    const { colaborador, mes, periodo, tipo, equipe } = req.body;
    if (!colaborador) return res.status(400).json({ error: 'colaborador é obrigatório' });
    const item = await prisma.agendaFerias.create({ data: { colaborador, mes, periodo, tipo, equipe } });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFerias = async (req, res) => {
  try {
    const { colaborador, mes, periodo, tipo, equipe } = req.body;
    const item = await prisma.agendaFerias.update({
      where: { id: req.params.id },
      data: { colaborador, mes, periodo, tipo, equipe },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeFerias = async (req, res) => {
  try {
    await prisma.agendaFerias.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Técnicos ─────────────────────────────────────────────────────────────────

exports.listTecnicos = async (req, res) => {
  try {
    const data = await prisma.agendaTecnico.findMany({ orderBy: { nome: 'asc' } });
    res.json(data);
  } catch (err) {
    console.error('listTecnicos error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.createTecnico = async (req, res) => {
  try {
    const { nome, equipe, modalidade, horario } = req.body;
    if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });
    const item = await prisma.agendaTecnico.create({ data: { nome, equipe, modalidade, horario } });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTecnico = async (req, res) => {
  try {
    const { nome, equipe, modalidade, horario } = req.body;
    const item = await prisma.agendaTecnico.update({
      where: { id: req.params.id },
      data: { nome, equipe, modalidade, horario },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeTecnico = async (req, res) => {
  try {
    await prisma.agendaTecnico.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Bulk import ──────────────────────────────────────────────────────────────

exports.bulkImport = async (req, res) => {
  const { visitas = [], plantoes = [], ferias = [], tecnicos = [], mode = 'replace' } = req.body;

  await prisma.$transaction(async (tx) => {
    if (mode === 'replace') {
      await tx.agendaVisita.deleteMany();
      await tx.agendaPlantao.deleteMany();
      await tx.agendaFerias.deleteMany();
      await tx.agendaTecnico.deleteMany();
    }

    const strip = obj => {
      const { id, tipoRegistro, createdAt, updatedAt, ...rest } = obj;
      return rest;
    };

    if (visitas.length)  await tx.agendaVisita.createMany({ data: visitas.map(strip),  skipDuplicates: true });
    if (plantoes.length) await tx.agendaPlantao.createMany({ data: plantoes.map(strip), skipDuplicates: true });
    if (ferias.length)   await tx.agendaFerias.createMany({ data: ferias.map(strip),   skipDuplicates: true });
    if (tecnicos.length) await tx.agendaTecnico.createMany({ data: tecnicos.map(strip), skipDuplicates: true });
  });

  const [v, p, f, t] = await Promise.all([
    prisma.agendaVisita.count(),
    prisma.agendaPlantao.count(),
    prisma.agendaFerias.count(),
    prisma.agendaTecnico.count(),
  ]);

  res.json({ visitas: v, plantoes: p, ferias: f, tecnicos: t });
};

// ─── Excluir todos ────────────────────────────────────────────────────────────

exports.clearAll = async (req, res) => {
  await prisma.$transaction([
    prisma.agendaVisita.deleteMany(),
    prisma.agendaPlantao.deleteMany(),
    prisma.agendaFerias.deleteMany(),
    prisma.agendaTecnico.deleteMany(),
  ]);
  res.json({ ok: true });
};

// ─── Stats ────────────────────────────────────────────────────────────────────

exports.stats = async (req, res) => {
  const [visitas, plantoes, ferias, tecnicos] = await Promise.all([
    prisma.agendaVisita.count(),
    prisma.agendaPlantao.count(),
    prisma.agendaFerias.count(),
    prisma.agendaTecnico.count(),
  ]);
  res.json({ visitas, plantoes, ferias, tecnicos });
};

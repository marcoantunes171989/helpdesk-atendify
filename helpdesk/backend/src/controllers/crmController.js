const prisma = require('../prisma');

const contactInclude = {
  company: { select: { id: true, name: true, fantasia: true } },
  _count: { select: { opportunities: true, activities: true } },
};

const oppInclude = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true, email: true, phone: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { activities: true } },
};

const actInclude = {
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
  opportunity: { select: { id: true, title: true, stage: true } },
  user: { select: { id: true, name: true } },
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

exports.listContacts = async (req, res) => {
  const { companyId, search, active } = req.query;
  const where = {};
  if (companyId) where.companyId = companyId;
  if (active !== undefined) where.active = active !== 'false';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { position: { contains: search, mode: 'insensitive' } },
    ];
  }
  const contacts = await prisma.crmContact.findMany({
    where,
    include: contactInclude,
    orderBy: { name: 'asc' },
  });
  res.json(contacts);
};

exports.createContact = async (req, res) => {
  const { name, email, phone, position, department, notes, companyId } = req.body;
  const last = await prisma.crmContact.findFirst({ orderBy: { code: 'desc' } });
  const contact = await prisma.crmContact.create({
    data: { code: (last?.code ?? 0) + 1, name, email, phone, position, department, notes, companyId },
    include: contactInclude,
  });
  res.status(201).json(contact);
};

exports.updateContact = async (req, res) => {
  const { name, email, phone, position, department, notes, active, companyId } = req.body;
  const contact = await prisma.crmContact.update({
    where: { id: req.params.id },
    data: { name, email, phone, position, department, notes, active, companyId },
    include: contactInclude,
  });
  res.json(contact);
};

exports.removeContact = async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction([
    prisma.crmActivity.updateMany({ where: { contactId: id }, data: { contactId: null } }),
    prisma.crmOpportunity.updateMany({ where: { contactId: id }, data: { contactId: null } }),
    prisma.crmContact.delete({ where: { id } }),
  ]);
  res.json({ message: 'Contato excluído com sucesso' });
};

// ─── Opportunities ────────────────────────────────────────────────────────────

exports.listOpportunities = async (req, res) => {
  const { stage, companyId, ownerId, search } = req.query;
  const where = {};
  if (stage) where.stage = stage;
  if (companyId) where.companyId = companyId;
  if (ownerId) where.ownerId = ownerId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  const opps = await prisma.crmOpportunity.findMany({
    where,
    include: oppInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(opps);
};

exports.createOpportunity = async (req, res) => {
  const { title, description, stage, value, probability, companyId, contactId, ownerId, expectedClose, notes } = req.body;
  const last = await prisma.crmOpportunity.findFirst({ orderBy: { code: 'desc' } });
  const opp = await prisma.crmOpportunity.create({
    data: {
      code: (last?.code ?? 0) + 1,
      title, description, stage, notes,
      value: value ? parseFloat(value) : null,
      probability: probability ? parseInt(probability) : 0,
      companyId,
      contactId: contactId || null,
      ownerId: ownerId || null,
      expectedClose: expectedClose ? new Date(expectedClose) : null,
    },
    include: oppInclude,
  });
  res.status(201).json(opp);
};

exports.updateOpportunity = async (req, res) => {
  const { title, description, stage, value, probability, companyId, contactId, ownerId, expectedClose, closedAt, notes } = req.body;
  const data = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(stage !== undefined && { stage }),
    ...(notes !== undefined && { notes }),
    ...(value !== undefined && { value: value ? parseFloat(value) : null }),
    ...(probability !== undefined && { probability: parseInt(probability) }),
    ...(companyId !== undefined && { companyId }),
    ...(contactId !== undefined && { contactId: contactId || null }),
    ...(ownerId !== undefined && { ownerId: ownerId || null }),
    ...(expectedClose !== undefined && { expectedClose: expectedClose ? new Date(expectedClose) : null }),
    ...(closedAt !== undefined && { closedAt: closedAt ? new Date(closedAt) : null }),
  };
  if (stage === 'WON' || stage === 'LOST') {
    data.closedAt = data.closedAt || new Date();
  }
  const opp = await prisma.crmOpportunity.update({
    where: { id: req.params.id },
    data,
    include: oppInclude,
  });
  res.json(opp);
};

exports.removeOpportunity = async (req, res) => {
  const { id } = req.params;
  await prisma.$transaction([
    prisma.crmActivity.updateMany({ where: { opportunityId: id }, data: { opportunityId: null } }),
    prisma.crmOpportunity.delete({ where: { id } }),
  ]);
  res.json({ message: 'Oportunidade excluída com sucesso' });
};

// ─── Activities ───────────────────────────────────────────────────────────────

exports.listActivities = async (req, res) => {
  const { type, status, companyId, contactId, opportunityId, userId } = req.query;
  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  if (contactId) where.contactId = contactId;
  if (opportunityId) where.opportunityId = opportunityId;
  if (userId) where.userId = userId;
  const activities = await prisma.crmActivity.findMany({
    where,
    include: actInclude,
    orderBy: [{ scheduledAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
  });
  res.json(activities);
};

exports.createActivity = async (req, res) => {
  const { type, title, description, status, companyId, contactId, opportunityId, userId, scheduledAt, completedAt } = req.body;
  const last = await prisma.crmActivity.findFirst({ orderBy: { code: 'desc' } });
  const activity = await prisma.crmActivity.create({
    data: {
      code: (last?.code ?? 0) + 1,
      type, title, description,
      status: status || 'PENDING',
      companyId: companyId || null,
      contactId: contactId || null,
      opportunityId: opportunityId || null,
      userId: userId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
    },
    include: actInclude,
  });
  res.status(201).json(activity);
};

exports.updateActivity = async (req, res) => {
  const { type, title, description, status, companyId, contactId, opportunityId, userId, scheduledAt, completedAt } = req.body;
  const data = {
    ...(type !== undefined && { type }),
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(status !== undefined && { status }),
    ...(companyId !== undefined && { companyId: companyId || null }),
    ...(contactId !== undefined && { contactId: contactId || null }),
    ...(opportunityId !== undefined && { opportunityId: opportunityId || null }),
    ...(userId !== undefined && { userId: userId || null }),
    ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
    ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
  };
  if (status === 'DONE' && !data.completedAt) data.completedAt = new Date();
  const activity = await prisma.crmActivity.update({
    where: { id: req.params.id },
    data,
    include: actInclude,
  });
  res.json(activity);
};

exports.removeActivity = async (req, res) => {
  await prisma.crmActivity.delete({ where: { id: req.params.id } });
  res.json({ message: 'Atividade excluída com sucesso' });
};

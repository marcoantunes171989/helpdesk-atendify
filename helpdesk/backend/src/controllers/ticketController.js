const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ticketInclude = {
  user: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true, slaHours: true } },
  company: { select: { id: true, name: true } },
  comments: {
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  },
};

exports.list = async (req, res) => {
  const { status, priority, categoryId, assignedTo, userId, search, companyId } = req.query;
  const where = {};

  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  if (assignedTo) where.assignedTo = assignedTo;
  if (userId) where.userId = userId;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(tickets);
};

exports.get = async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: ticketInclude,
  });

  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });
  res.json(ticket);
};

exports.create = async (req, res) => {
  const { title, description, priority, categoryId, companyId } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
  }

  const targetCompanyId = companyId || req.user.companyId;

  let slaDeadline = null;
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category) {
      slaDeadline = new Date(Date.now() + category.slaHours * 60 * 60 * 1000);
    }
  }

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority: priority || 'MEDIUM',
      categoryId,
      userId: req.user.id,
      companyId: targetCompanyId,
      slaDeadline,
    },
    include: ticketInclude,
  });

  res.status(201).json(ticket);
};

exports.update = async (req, res) => {
  const { title, description, status, priority, categoryId, assignedTo } = req.body;
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

  const data = { title, description, priority, categoryId, assignedTo };

  if (status && status !== ticket.status) {
    data.status = status;
    if (['RESOLVED', 'CLOSED'].includes(status) && !ticket.resolvedAt) {
      data.resolvedAt = new Date();
    }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data,
    include: ticketInclude,
  });

  res.json(updated);
};

exports.remove = async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

  if (['CLOSED', 'CANCELLED'].includes(ticket.status)) {
    return res.status(409).json({ error: 'Chamados fechados ou cancelados não podem ser excluídos' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticketComment.deleteMany({ where: { ticketId: id } });
    await tx.ticket.delete({ where: { id } });
  });

  res.json({ message: 'Chamado excluído com sucesso' });
};

exports.addComment = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

  if (ticket.status === 'CLOSED') {
    return res.status(400).json({ error: 'Chamado fechado não aceita comentários' });
  }

  const comment = await prisma.ticketComment.create({
    data: { message, ticketId: ticket.id, userId: req.user.id },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (ticket.status === 'OPEN' && req.user.role !== 'CLIENT') {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS' } });
  }

  res.status(201).json(comment);
};

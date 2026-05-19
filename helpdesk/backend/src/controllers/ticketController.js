const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ticketInclude = {
  user: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
  employee: { select: { id: true, name: true, position: true } },
  technician: { select: { id: true, name: true } },
  ticketStatus: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, slaHours: true } },
  company: { select: { id: true, name: true } },
  comments: {
    include: {
      user: { select: { id: true, name: true, role: true } },
      attachments: {
        select: { id: true, name: true, mimeType: true, size: true, data: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  attachments: {
    select: { id: true, name: true, mimeType: true, size: true, data: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
};

exports.list = async (req, res) => {
  const { status, priority, categoryId, assignedTo, userId, search, companyId, statusId } = req.query;
  const where = {};

  if (companyId) where.companyId = companyId;
  if (status) where.status = status;
  if (statusId) where.statusId = statusId;
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
      employee: { select: { id: true, name: true, position: true } },
      technician: { select: { id: true, name: true } },
      ticketStatus: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
      _count: { select: { comments: true, attachments: true } },
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
  const { title, description, priority, categoryId, companyId, employeeId, technicianId, attachments } = req.body;

  if (!title) return res.status(400).json({ error: 'Título é obrigatório' });
  if (!description) return res.status(400).json({ error: 'Descrição é obrigatória' });
  if (!companyId) return res.status(400).json({ error: 'Empresa é obrigatória' });
  if (!categoryId) return res.status(400).json({ error: 'Categoria é obrigatória' });
  if (!employeeId) return res.status(400).json({ error: 'Funcionário é obrigatório' });
  if (!technicianId) return res.status(400).json({ error: 'Técnico é obrigatório' });
  if (!priority) return res.status(400).json({ error: 'Prioridade é obrigatória' });

  let slaDeadline = null;
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category) {
      slaDeadline = new Date(Date.now() + category.slaHours * 60 * 60 * 1000);
    }
  }

  const { statusId } = req.body;

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority: priority || 'MEDIUM',
      categoryId: categoryId || null,
      employeeId: employeeId || null,
      technicianId: technicianId || null,
      statusId: statusId || null,
      userId: req.user.id,
      companyId,
      slaDeadline,
    },
  });

  if (attachments && attachments.length > 0) {
    await prisma.ticketAttachment.createMany({
      data: attachments.map(a => ({
        ticketId: ticket.id,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        data: a.data,
      })),
    });
  }

  const result = await prisma.ticket.findUnique({
    where: { id: ticket.id },
    include: ticketInclude,
  });

  res.status(201).json(result);
};

exports.update = async (req, res) => {
  const { id } = req.params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

  const { title, description, status, priority, categoryId, assignedTo, companyId, employeeId } = req.body;
  const data = {};

  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = priority;
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (assignedTo !== undefined) data.assignedTo = assignedTo || null;
  if (companyId !== undefined) data.companyId = companyId;
  if (employeeId !== undefined) data.employeeId = employeeId || null;
  if (req.body.technicianId !== undefined) data.technicianId = req.body.technicianId || null;
  if ('statusId' in req.body) data.statusId = req.body.statusId || null;

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

const commentInclude = {
  user: { select: { id: true, name: true, role: true } },
  attachments: {
    select: { id: true, name: true, mimeType: true, size: true, data: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
};

exports.addComment = async (req, res) => {
  const { message, attachments } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

  if (ticket.status === 'CLOSED') {
    return res.status(400).json({ error: 'Chamado fechado não aceita trâmites' });
  }

  const comment = await prisma.ticketComment.create({
    data: {
      message,
      ticketId: ticket.id,
      userId: req.user.id,
      ...(attachments?.length > 0 && {
        attachments: {
          createMany: {
            data: attachments.map(a => ({ name: a.name, mimeType: a.mimeType, size: a.size, data: a.data })),
          },
        },
      }),
    },
    include: commentInclude,
  });

  if (ticket.status === 'OPEN' && req.user.role !== 'CLIENT') {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS' } });
  }

  res.status(201).json(comment);
};

exports.deleteComment = async (req, res) => {
  const { id, commentId } = req.params;

  const comment = await prisma.ticketComment.findFirst({ where: { id: commentId, ticketId: id } });
  if (!comment) return res.status(404).json({ error: 'Trâmite não encontrado' });

  if (comment.userId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sem permissão para excluir este trâmite' });
  }

  await prisma.ticketComment.delete({ where: { id: commentId } });
  res.json({ message: 'Trâmite removido com sucesso' });
};

exports.updateComment = async (req, res) => {
  const { message } = req.body;
  const { id, commentId } = req.params;
  if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

  const comment = await prisma.ticketComment.findFirst({ where: { id: commentId, ticketId: id } });
  if (!comment) return res.status(404).json({ error: 'Trâmite não encontrado' });

  if (comment.userId !== req.user.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sem permissão para editar este trâmite' });
  }

  const updated = await prisma.ticketComment.update({
    where: { id: commentId },
    data: { message },
    include: commentInclude,
  });

  res.json(updated);
};

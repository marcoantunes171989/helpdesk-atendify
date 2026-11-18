const prisma = require('../prisma');
const { userBrief, buildTicketAccessView } = require('../services/ticketAccess');

async function loadTicket(id) {
  return prisma.ticket.findUnique({
    where: { id },
    select: { id: true, companyId: true, userId: true },
  });
}

exports.listCandidates = async (req, res) => {
  const canPick = req.permissions?.has('tickets.manage') || req.permissions?.has('companies.update');
  if (!canPick) return res.status(403).json({ error: 'Acesso negado' });

  const users = await prisma.user.findMany({
    where: { active: true },
    select: userBrief,
    orderBy: { name: 'asc' },
  });
  res.json(users);
};

exports.list = async (req, res) => {
  const ticket = await loadTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });
  res.json(await buildTicketAccessView(ticket));
};

exports.set = async (req, res) => {
  const { userId, mode } = req.body;
  if (!userId || !['GRANT', 'DENY'].includes(mode)) {
    return res.status(400).json({ error: 'Informe o usuário e o tipo de acesso' });
  }

  const ticket = await loadTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });
  if (userId === ticket.userId) {
    return res.status(400).json({ error: 'Quem abriu o chamado já tem acesso' });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true },
  });
  if (!target || !target.active) {
    return res.status(400).json({ error: 'Usuário não encontrado ou inativo' });
  }

  await prisma.ticketUserAccess.upsert({
    where: { ticketId_userId: { ticketId: ticket.id, userId } },
    create: { ticketId: ticket.id, userId, mode },
    update: { mode },
  });

  res.json(await buildTicketAccessView(ticket));
};

exports.remove = async (req, res) => {
  const ticket = await loadTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

  await prisma.ticketUserAccess.deleteMany({
    where: { ticketId: ticket.id, userId: req.params.userId },
  });

  res.json(await buildTicketAccessView(ticket));
};

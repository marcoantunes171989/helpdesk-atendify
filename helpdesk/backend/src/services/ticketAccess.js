const prisma = require('../prisma');

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'AGENT'];

const userBrief = { id: true, name: true, email: true, role: true };

function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

// Cliente vê o chamado se o abriu, se está atribuído a ele, se recebeu GRANT
// neste chamado, ou se está vinculado à empresa e este chamado não está em DENY.
function clientTicketWhere(userId) {
  return {
    OR: [
      { userId },
      { assignedTo: userId },
      { userAccess: { some: { userId, mode: 'GRANT' } } },
      {
        AND: [
          { company: { userAccess: { some: { userId } } } },
          { NOT: { userAccess: { some: { userId, mode: 'DENY' } } } },
        ],
      },
    ],
  };
}

async function userCanAccessTicket(user, ticket) {
  if (!user || !ticket) return false;
  if (isStaff(user.role)) return true;
  if (ticket.userId === user.id) return true;
  if (ticket.assignedTo && ticket.assignedTo === user.id) return true;

  const explicit = await prisma.ticketUserAccess.findUnique({
    where: { ticketId_userId: { ticketId: ticket.id, userId: user.id } },
  });
  if (explicit?.mode === 'DENY') return false;
  if (explicit?.mode === 'GRANT') return true;
  if (!ticket.companyId) return false;

  const companyLink = await prisma.companyUserAccess.findUnique({
    where: { companyId_userId: { companyId: ticket.companyId, userId: user.id } },
  });
  return !!companyLink;
}

async function buildTicketAccessView(ticket) {
  const [companyLinks, explicit] = await Promise.all([
    prisma.companyUserAccess.findMany({
      where: { companyId: ticket.companyId },
      include: { user: { select: userBrief } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.ticketUserAccess.findMany({
      where: { ticketId: ticket.id },
      include: { user: { select: userBrief } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const denyIds = new Set(explicit.filter(row => row.mode === 'DENY').map(row => row.userId));

  return {
    companyUsers: companyLinks.map(link => ({
      ...link.user,
      excluded: denyIds.has(link.userId),
    })),
    grants: explicit.filter(row => row.mode === 'GRANT').map(row => row.user),
  };
}

module.exports = {
  userBrief,
  isStaff,
  clientTicketWhere,
  userCanAccessTicket,
  buildTicketAccessView,
};

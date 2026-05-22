const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.tickets = async (req, res) => {
  const { dateFrom, dateTo, companyId, categoryId, priority, status, employeeId, technicianId } = req.query;

  const where = {};
  if (companyId) where.companyId = companyId;
  if (categoryId) where.categoryId = categoryId;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (technicianId) where.technicianId = technicianId;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      employee: { select: { id: true, name: true, position: true } },
      technician: { select: { id: true, name: true } },
      ticketStatus: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, slaHours: true } },
      company: { select: { id: true, name: true, fantasia: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(tickets);
};

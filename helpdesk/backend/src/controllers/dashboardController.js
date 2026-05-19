const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.stats = async (req, res) => {
  const companyFilter = req.user.role === 'SUPER_ADMIN'
    ? {}
    : { companyId: req.user.companyId };

  const userFilter = req.user.role === 'CLIENT'
    ? { userId: req.user.id }
    : companyFilter;

  const [total, open, inProgress, resolved, closed, overdueSla] = await Promise.all([
    prisma.ticket.count({ where: userFilter }),
    prisma.ticket.count({ where: { ...userFilter, status: 'OPEN' } }),
    prisma.ticket.count({ where: { ...userFilter, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { ...userFilter, status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { ...userFilter, status: 'CLOSED' } }),
    prisma.ticket.count({
      where: {
        ...userFilter,
        slaDeadline: { lt: new Date() },
        status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
      },
    }),
  ]);

  const byPriority = await prisma.ticket.groupBy({
    by: ['priority'],
    where: userFilter,
    _count: true,
  });

  const byStatus = await prisma.ticket.groupBy({
    by: ['status'],
    where: userFilter,
    _count: true,
  });

  const byCategory = await prisma.ticket.groupBy({
    by: ['categoryId'],
    where: { ...userFilter, categoryId: { not: null } },
    _count: true,
    orderBy: { _count: { categoryId: 'desc' } },
    take: 5,
  });

  const categoryIds = byCategory.map(c => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  const byCategoryWithName = byCategory.map(c => ({
    ...c,
    name: categories.find(cat => cat.id === c.categoryId)?.name || 'Sem categoria',
  }));

  const recentTickets = await prisma.ticket.findMany({
    where: userFilter,
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  res.json({
    summary: { total, open, inProgress, resolved, closed, overdueSla },
    byPriority,
    byStatus,
    byCategory: byCategoryWithName,
    recentTickets,
  });
};

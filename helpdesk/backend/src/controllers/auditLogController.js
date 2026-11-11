const prisma = require('../prisma');

exports.list = async (req, res) => {
  const { resource, action, actorId } = req.query;
  const where = {};
  if (resource) where.resource = resource;
  if (action) where.action = action;
  if (actorId) where.actorId = actorId;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(logs);
};

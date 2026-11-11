const prisma = require('../prisma');

// Nunca registrar senhas, tokens ou outros segredos em metadata.
async function logAudit({ actorId, actorName, action, resource, resourceId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: { actorId, actorName, action, resource, resourceId, metadata },
    });
  } catch (err) {
    console.error('[AUDIT_LOG_FAILED]', action, resource, err.message);
  }
}

module.exports = { logAudit };

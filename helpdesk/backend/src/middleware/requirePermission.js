const prisma = require('../prisma');
const { resolveEffectivePermissions } = require('../permissions/resolve');
const { logAudit } = require('../utils/audit');

// Middleware de autorização granular (DENY BY DEFAULT).
// Diferente do middleware `auth` (que só decodifica o JWT para rotas de alto
// volume), este aqui consulta o banco a cada chamada para confirmar que o
// usuário ainda está ativo e para carregar o grupo de acesso atual — exigido
// pela ETAPA 6 (revogação efetiva de acesso). Usar apenas nas rotas sensíveis
// (gestão de usuários, grupos de acesso, permissões), não em rotas de alto
// tráfego, para preservar a otimização de performance do login/app.
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, role: true, active: true, accessGroupId: true },
    });

    if (!dbUser || !dbUser.active) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }

    const permissions = await resolveEffectivePermissions(dbUser);
    if (!permissions.has(permissionKey)) {
      await logAudit({
        actorId: dbUser.id,
        actorName: dbUser.name,
        action: 'access_denied',
        resource: permissionKey,
        resourceId: null,
        metadata: { path: req.originalUrl, method: req.method },
      });
      return res.status(403).json({ error: 'Acesso negado' });
    }

    req.dbUser = dbUser;
    req.permissions = permissions;
    next();
  };
}

// Variante não-bloqueante: carrega req.dbUser/req.permissions sem exigir uma
// permissão específica. Usada em endpoints de apoio (ETAPA 6) que precisam
// ficar abertos a qualquer usuário autenticado para alimentar formulários
// (ex.: seleção de empresa/funcionário ao abrir um chamado), mas cujo
// controller decide, por permissão, quais campos retornar (dados sensíveis
// só para quem tem a permissão de gestão do módulo).
function loadPermissions() {
  return async (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, role: true, active: true, accessGroupId: true },
    });

    if (!dbUser || !dbUser.active) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    }

    req.dbUser = dbUser;
    req.permissions = await resolveEffectivePermissions(dbUser);
    next();
  };
}

module.exports = requirePermission;
module.exports.loadPermissions = loadPermissions;

const { MODULES, PERMISSIONS } = require('../permissions/catalog');
const { resolveEffectivePermissions } = require('../permissions/resolve');
const prisma = require('../prisma');

// Catálogo completo — usado pela UI para montar a matriz de permissões.
exports.catalog = async (req, res) => {
  res.json({ modules: MODULES, permissions: PERMISSIONS });
};

// Permissões efetivas do usuário autenticado — usado pelo frontend para
// decidir quais menus/rotas exibir.
exports.me = async (req, res) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, role: true, active: true, accessGroupId: true },
  });
  if (!dbUser || !dbUser.active) return res.status(401).json({ error: 'Usuário inativo' });

  const permissions = await resolveEffectivePermissions(dbUser);
  res.json({ permissions: Array.from(permissions) });
};

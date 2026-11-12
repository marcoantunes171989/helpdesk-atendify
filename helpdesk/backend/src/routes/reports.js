const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/reportController');

// RBAC-03 ETAPA 5: a autorização segue a permissão efetiva (reports.read),
// não o Role legado — um ADMIN cujo grupo de acesso não conceda reports.read
// é bloqueado, e um AGENT a quem um grupo personalizado conceda reports.read
// passa a ter acesso, resolvendo a divergência registrada na RBAC-02.
// Relatórios expõem dados agregados de todas as empresas/clientes, por isso
// CLIENT não recebe reports.read no mapeamento padrão (ver permissions/catalog.js).
router.get('/tickets', auth, requirePermission('reports.read'), wrap(ctrl.tickets));

module.exports = router;

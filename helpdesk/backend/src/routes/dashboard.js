const router = require('express').Router();
const auth   = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap   = require('../middleware/asyncHandler');
const ctrl   = require('../controllers/dashboardController');

// Todas as telas do Dashboard exigem dashboard.read; os controllers, por sua
// vez, restringem o ESCOPO dos dados por role (CLIENT só vê o que é seu —
// ETAPA 2 do RBAC-03). Isso evita vazamento de dados agregados de outras
// empresas/clientes mesmo que o usuário tenha a permissão de ler o dashboard.
router.get('/stats',           auth, requirePermission('dashboard.read'), wrap(ctrl.stats));
router.get('/kpis',            auth, requirePermission('dashboard.read'), wrap(ctrl.kpis));
router.get('/volume',          auth, requirePermission('dashboard.read'), wrap(ctrl.volume));
router.get('/categories',      auth, requirePermission('dashboard.read'), wrap(ctrl.categories));
router.get('/sla-by-priority', auth, requirePermission('dashboard.read'), wrap(ctrl.slaByPriority));
router.get('/by-status',       auth, requirePermission('dashboard.read'), wrap(ctrl.byStatus));
router.get('/agents',          auth, requirePermission('dashboard.read'), wrap(ctrl.agents));
router.get('/queue/realtime',  auth, requirePermission('dashboard.read'), wrap(ctrl.queue));

module.exports = router;

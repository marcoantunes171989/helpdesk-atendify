const router = require('express').Router();
const ctrl   = require('../controllers/visitaController');
const auth   = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');
const requirePermission = require('../middleware/requirePermission');
const wrap   = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Convertido de minRole('AGENT') para visitas.* (ETAPA 4 do RBAC-03) —
// exclusão continua restrita a ADMIN/SUPER_ADMIN.
router.get('/',    auth, requirePermission('visitas.read'), wrap(ctrl.list));
router.get('/:id', auth, requirePermission('visitas.read'), wrap(ctrl.get));
router.post('/',   auth, requirePermission('visitas.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('visitas.update'), wrap(ctrl.update));
router.delete('/:id', auth, minRole('ADMIN'), wrap(ctrl.remove));

module.exports = router;

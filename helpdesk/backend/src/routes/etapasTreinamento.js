const router = require('express').Router();
const ctrl = require('../controllers/etapaTreinamentoController');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');
const requirePermission = require('../middleware/requirePermission');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Convertido de minRole('AGENT') para treinamentos.* (ETAPA 3 do RBAC-04) —
// etapas de treinamento são um sub-recurso de treinamentos, reaproveitando
// o mesmo grupo de permissões já convertido em routes/treinamentos.js;
// exclusão continua restrita a ADMIN/SUPER_ADMIN.
router.get('/',     auth, requirePermission('treinamentos.read'), wrap(ctrl.list));
router.get('/:id',  auth, requirePermission('treinamentos.read'), wrap(ctrl.get));
router.post('/',    auth, requirePermission('treinamentos.create'), wrap(ctrl.create));
router.put('/:id',  auth, requirePermission('treinamentos.update'), wrap(ctrl.update));
router.delete('/:id', auth, minRole('ADMIN'), wrap(ctrl.remove));

module.exports = router;

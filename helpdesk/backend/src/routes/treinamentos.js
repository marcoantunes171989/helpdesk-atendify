const router = require('express').Router();
const ctrl = require('../controllers/treinamentoController');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');
const requirePermission = require('../middleware/requirePermission');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Convertido de minRole('AGENT') para treinamentos.* (ETAPA 4 do RBAC-03) —
// exclusão continua restrita a ADMIN/SUPER_ADMIN.
router.get('/',                              auth, requirePermission('treinamentos.read'), wrap(ctrl.list));
router.get('/:id',                           auth, requirePermission('treinamentos.read'), wrap(ctrl.get));
router.post('/',                             auth, requirePermission('treinamentos.create'), wrap(ctrl.create));
router.put('/:id',                           auth, requirePermission('treinamentos.update'), wrap(ctrl.update));
router.put('/:id/participantes/:participanteId', auth, requirePermission('treinamentos.update'), wrap(ctrl.updateParticipante));
router.delete('/:id',                        auth, minRole('ADMIN'), wrap(ctrl.remove));

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/implantacaoController');
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');
const requirePermission = require('../middleware/requirePermission');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Convertido de minRole('AGENT') para implantacoes.* (ETAPA 4 do RBAC-03) —
// exclusão continua restrita a ADMIN/SUPER_ADMIN (minRole), comportamento
// preservado e mais restritivo do que o catálogo concederia por padrão.
router.get('/',              auth, requirePermission('implantacoes.read'), wrap(ctrl.list));
router.get('/:id',           auth, requirePermission('implantacoes.read'), wrap(ctrl.get));
router.post('/',             auth, requirePermission('implantacoes.create'), wrap(ctrl.create));
router.put('/:id',           auth, requirePermission('implantacoes.update'), wrap(ctrl.update));
router.put('/:id/fases/:faseId', auth, requirePermission('implantacoes.update'), wrap(ctrl.updateFase));
router.delete('/:id',        auth, minRole('ADMIN'), wrap(ctrl.remove));

module.exports = router;

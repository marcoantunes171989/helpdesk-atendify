const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/knowledgeController');

// Leitura/consulta e escrita agora seguem a matriz de permissões (RBAC-05).
// knowledge.read está nos padrões de ADMIN/AGENT/CLIENT (ver catalog.js),
// então nenhum usuário legado perde o acesso que já tinha.
router.get('/', auth, requirePermission('knowledge.read'), wrap(ctrl.list));
router.get('/:id', auth, requirePermission('knowledge.read'), wrap(ctrl.get));
router.post('/query', auth, requirePermission('knowledge.read'), wrap(ctrl.query));
router.post('/', auth, requirePermission('knowledge.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('knowledge.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('knowledge.delete'), wrap(ctrl.remove));

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const { loadPermissions } = requirePermission;
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/employeeController');

// GET fica aberto a qualquer usuário autenticado (ex.: CLIENT precisa listar
// funcionários para abrir um chamado); o controller usa req.permissions para
// restringir campos sensíveis (CPF, salário, e-mail) a quem tem
// employees.read (ETAPA 6 do RBAC-03).
router.get('/', auth, loadPermissions(), wrap(ctrl.list));
router.get('/departments', auth, wrap(ctrl.departments));
router.get('/:id/links', auth, wrap(ctrl.checkLinks));
router.get('/:id', auth, loadPermissions(), wrap(ctrl.get));
router.post('/', auth, requirePermission('employees.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('employees.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('employees.delete'), wrap(ctrl.remove));

module.exports = router;

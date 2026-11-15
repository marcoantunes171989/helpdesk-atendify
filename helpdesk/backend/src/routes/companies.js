const router = require('express').Router();
const auth = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');
const requirePermission = require('../middleware/requirePermission');
const { loadPermissions } = requirePermission;
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/companyController');
const attCtrl = require('../controllers/companyAttachmentController');

// GET fica aberto a qualquer usuário autenticado (ex.: CLIENT precisa listar
// empresas para abrir um chamado), mas o controller usa req.permissions para
// decidir se retorna os campos completos (CNPJ, endereço, contatos) ou só o
// necessário para o formulário (ETAPA 6 do RBAC-03).
router.get('/', auth, loadPermissions(), wrap(ctrl.list));
router.get('/:id/links', auth, wrap(ctrl.links));
router.get('/:id', auth, loadPermissions(), wrap(ctrl.get));
// RBAC-06 ETAPA 2: create/update/delete usavam minRole('ADMIN'), ignorando
// companies.create/update/delete do catálogo — um grupo de acesso podia
// conceder a permissão (aparecendo liberada na matriz e no frontend via
// can()) e o backend continuava bloqueando com 403, como categories/
// technicians/statuses/states_cities antes do RBAC-05. ADMIN/SUPER_ADMIN
// legados continuam com acesso total (ROLE_DEFAULT_PERMISSIONS), e AGENT/
// CLIENT legados continuam sem create/update/delete por padrão — só um
// grupo de acesso configurado explicitamente concede isso a outras roles,
// sem ampliar permissão de ninguém por conta desta migração.
router.post('/', auth, requirePermission('companies.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('companies.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('companies.delete'), wrap(ctrl.remove));

// Anexos de empresa podem conter documentos/contratos sensíveis — não são
// necessários para o formulário de abertura de chamado, então exigem
// companies.read (ETAPA 6), diferente da listagem básica de empresas acima.
router.get('/:companyId/attachments', auth, requirePermission('companies.read'), wrap(attCtrl.list));
router.post('/:companyId/attachments', auth, minRole('ADMIN'), wrap(attCtrl.create));
router.get('/:companyId/attachments/:id/download', auth, requirePermission('companies.read'), wrap(attCtrl.download));
router.delete('/:companyId/attachments/:id', auth, minRole('ADMIN'), wrap(attCtrl.remove));

module.exports = router;

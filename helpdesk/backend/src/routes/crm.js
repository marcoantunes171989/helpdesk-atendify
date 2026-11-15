const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/crmController');

// Convertido de minRole('AGENT') para a permissão efetiva crm.* (ETAPA 4 do
// RBAC-03): um grupo de acesso personalizado agora pode restringir CRM de um
// AGENT, ou liberar para quem o catálogo autoriza — sem depender só do Role.
// Contacts
router.get('/contacts', auth, requirePermission('crm.read'), wrap(ctrl.listContacts));
router.post('/contacts', auth, requirePermission('crm.create'), wrap(ctrl.createContact));
router.put('/contacts/:id', auth, requirePermission('crm.update'), wrap(ctrl.updateContact));
router.delete('/contacts/:id', auth, requirePermission('crm.delete'), wrap(ctrl.removeContact));

// Opportunities
router.get('/opportunities', auth, requirePermission('crm.read'), wrap(ctrl.listOpportunities));
router.post('/opportunities', auth, requirePermission('crm.create'), wrap(ctrl.createOpportunity));
router.put('/opportunities/:id', auth, requirePermission('crm.update'), wrap(ctrl.updateOpportunity));
router.delete('/opportunities/:id', auth, requirePermission('crm.delete'), wrap(ctrl.removeOpportunity));

// Activities
router.get('/activities', auth, requirePermission('crm.read'), wrap(ctrl.listActivities));
router.post('/activities', auth, requirePermission('crm.create'), wrap(ctrl.createActivity));
router.put('/activities/:id', auth, requirePermission('crm.update'), wrap(ctrl.updateActivity));
router.delete('/activities/:id', auth, requirePermission('crm.delete'), wrap(ctrl.removeActivity));

module.exports = router;

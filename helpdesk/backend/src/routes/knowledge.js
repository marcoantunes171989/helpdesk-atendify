const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/knowledgeController');

router.get('/', auth, requirePermission('knowledge.read'), wrap(ctrl.list));
router.get(
  '/attachments/:attachmentId/download',
  auth,
  requirePermission('knowledge.read'),
  wrap(ctrl.downloadAttachment),
);

router.get('/categories', auth, requirePermission('knowledge.read'), wrap(ctrl.listCategories));
router.post('/categories', auth, requirePermission('knowledge.create'), wrap(ctrl.createCategory));
router.put('/categories/:id', auth, requirePermission('knowledge.update'), wrap(ctrl.updateCategory));
router.delete('/categories/:id', auth, requirePermission('knowledge.update'), wrap(ctrl.removeCategory));

router.get('/:id', auth, requirePermission('knowledge.read'), wrap(ctrl.get));
router.post('/query', auth, requirePermission('knowledge.read'), wrap(ctrl.query));
router.post('/', auth, requirePermission('knowledge.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('knowledge.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('knowledge.delete'), wrap(ctrl.remove));

module.exports = router;

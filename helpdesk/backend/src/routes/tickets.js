const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const requirePermission = require('../middleware/requirePermission');
const { loadPermissions } = requirePermission;
const ctrl = require('../controllers/ticketController');
const accessCtrl = require('../controllers/ticketAccessController');

router.get('/', auth, wrap(ctrl.list));
router.get('/meta/users', auth, loadPermissions(), wrap(accessCtrl.listCandidates));
router.get('/:id/access', auth, requirePermission('tickets.manage'), wrap(accessCtrl.list));
router.put('/:id/access', auth, requirePermission('tickets.manage'), wrap(accessCtrl.set));
router.delete('/:id/access/:userId', auth, requirePermission('tickets.manage'), wrap(accessCtrl.remove));
router.get('/:id', auth, wrap(ctrl.get));
router.post('/', auth, wrap(ctrl.create));
router.put('/:id', auth, wrap(ctrl.update));
router.delete('/:id', auth, wrap(ctrl.remove));
router.post('/:id/rate', auth, wrap(ctrl.rate));
router.post('/:id/comments', auth, wrap(ctrl.addComment));
router.put('/:id/comments/:commentId', auth, wrap(ctrl.updateComment));
router.delete('/:id/comments/:commentId', auth, wrap(ctrl.deleteComment));

module.exports = router;

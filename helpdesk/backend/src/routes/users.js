const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/userController');

router.get('/', auth, requirePermission('users.read'), wrap(ctrl.list));
router.get('/:id/links', auth, requirePermission('users.read'), wrap(ctrl.checkLinks));
router.get('/:id', auth, requirePermission('users.read'), wrap(ctrl.get));
router.post('/', auth, requirePermission('users.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('users.update'), wrap(ctrl.update));
router.put('/:id/reset-password', auth, requirePermission('users.manage'), wrap(ctrl.resetPassword));
router.delete('/:id', auth, requirePermission('users.delete'), wrap(ctrl.remove));

module.exports = router;

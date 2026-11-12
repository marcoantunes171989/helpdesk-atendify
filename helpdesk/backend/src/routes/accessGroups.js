const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/accessGroupController');

router.get('/', auth, requirePermission('access_groups.read'), wrap(ctrl.list));
router.get('/:id', auth, requirePermission('access_groups.read'), wrap(ctrl.get));
router.post('/', auth, requirePermission('access_groups.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('access_groups.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('access_groups.delete'), wrap(ctrl.remove));

module.exports = router;

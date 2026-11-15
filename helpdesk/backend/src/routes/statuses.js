const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/statusController');

router.get('/', auth, requirePermission('statuses.read'), wrap(ctrl.list));
router.get('/:id', auth, requirePermission('statuses.read'), wrap(ctrl.get));
router.post('/', auth, requirePermission('statuses.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('statuses.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('statuses.delete'), wrap(ctrl.remove));

module.exports = router;

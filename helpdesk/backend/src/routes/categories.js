const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/categoryController');

router.get('/', auth, requirePermission('categories.read'), wrap(ctrl.list));
router.get('/:id/links', auth, requirePermission('categories.read'), wrap(ctrl.checkLinks));
router.get('/:id', auth, requirePermission('categories.read'), wrap(ctrl.get));
router.post('/', auth, requirePermission('categories.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('categories.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('categories.delete'), wrap(ctrl.remove));

module.exports = router;

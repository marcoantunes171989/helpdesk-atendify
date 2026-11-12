const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/technicianController');

router.get('/', auth, requirePermission('technicians.read'), wrap(ctrl.list));
router.get('/:id', auth, requirePermission('technicians.read'), wrap(ctrl.get));
router.post('/', auth, requirePermission('technicians.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('technicians.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('technicians.delete'), wrap(ctrl.remove));

module.exports = router;

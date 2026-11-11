const router = require('express').Router();
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/cityController');

router.get('/', auth, requirePermission('states_cities.read'), wrap(ctrl.list));
router.post('/import-ibge', auth, requirePermission('states_cities.create'), wrap(ctrl.importFromIbge));
router.delete('/all', auth, requirePermission('states_cities.delete'), wrap(ctrl.removeAll));
router.get('/:id', auth, requirePermission('states_cities.read'), wrap(ctrl.get));
router.post('/', auth, requirePermission('states_cities.create'), wrap(ctrl.create));
router.put('/:id', auth, requirePermission('states_cities.update'), wrap(ctrl.update));
router.delete('/:id', auth, requirePermission('states_cities.delete'), wrap(ctrl.remove));

module.exports = router;

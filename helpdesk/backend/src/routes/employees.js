const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/employeeController');

router.get('/', auth, wrap(ctrl.list));
router.get('/departments', auth, wrap(ctrl.departments));
router.get('/:id/links', auth, wrap(ctrl.checkLinks));
router.get('/:id', auth, wrap(ctrl.get));
router.post('/', auth, wrap(ctrl.create));
router.put('/:id', auth, wrap(ctrl.update));
router.delete('/:id', auth, wrap(ctrl.remove));

module.exports = router;

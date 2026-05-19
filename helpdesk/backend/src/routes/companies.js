const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/companyController');

router.get('/', auth, ctrl.list);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, authorize('SUPER_ADMIN'), ctrl.create);
router.put('/:id', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.update);
router.delete('/:id', auth, authorize('SUPER_ADMIN'), ctrl.remove);

module.exports = router;

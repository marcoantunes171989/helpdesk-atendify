const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/userController');

router.get('/', auth, authorize('SUPER_ADMIN', 'ADMIN', 'AGENT'), ctrl.list);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.create);
router.put('/:id', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.update);
router.put('/:id/reset-password', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.resetPassword);

module.exports = router;

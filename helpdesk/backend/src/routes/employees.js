const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const ctrl = require('../controllers/employeeController');

router.get('/', auth, authorize('SUPER_ADMIN', 'ADMIN', 'AGENT'), ctrl.list);
router.get('/departments', auth, authorize('SUPER_ADMIN', 'ADMIN', 'AGENT'), ctrl.departments);
router.get('/:id', auth, authorize('SUPER_ADMIN', 'ADMIN', 'AGENT'), ctrl.get);
router.post('/', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.create);
router.put('/:id', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.update);
router.delete('/:id', auth, authorize('SUPER_ADMIN', 'ADMIN'), ctrl.remove);

module.exports = router;

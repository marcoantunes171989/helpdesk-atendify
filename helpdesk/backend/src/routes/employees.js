const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/employeeController');

router.get('/', auth, ctrl.list);
router.get('/departments', auth, ctrl.departments);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;

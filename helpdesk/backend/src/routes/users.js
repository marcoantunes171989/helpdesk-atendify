const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/', auth, ctrl.list);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.put('/:id/reset-password', auth, ctrl.resetPassword);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;

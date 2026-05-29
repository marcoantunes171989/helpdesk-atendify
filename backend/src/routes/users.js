const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/userController');

router.get('/', auth, wrap(ctrl.list));
router.get('/:id/links', auth, wrap(ctrl.checkLinks));
router.get('/:id', auth, wrap(ctrl.get));
router.post('/', auth, wrap(ctrl.create));
router.put('/:id', auth, wrap(ctrl.update));
router.put('/:id/reset-password', auth, wrap(ctrl.resetPassword));
router.delete('/:id', auth, wrap(ctrl.remove));

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/authController');

router.post('/login', wrap(ctrl.login));
router.get('/me', auth, wrap(ctrl.me));
router.put('/change-password', auth, wrap(ctrl.changePassword));

module.exports = router;

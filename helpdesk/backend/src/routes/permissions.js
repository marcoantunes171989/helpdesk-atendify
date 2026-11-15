const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/permissionController');

router.get('/catalog', auth, wrap(ctrl.catalog));
router.get('/me', auth, wrap(ctrl.me));

module.exports = router;

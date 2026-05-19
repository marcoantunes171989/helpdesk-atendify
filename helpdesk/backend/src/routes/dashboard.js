const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/dashboardController');

router.get('/stats', auth, wrap(ctrl.stats));

module.exports = router;

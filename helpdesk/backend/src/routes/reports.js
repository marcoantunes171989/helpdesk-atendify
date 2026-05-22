const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/reportController');

router.get('/tickets', auth, wrap(ctrl.tickets));

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.get('/stats', auth, ctrl.stats);

module.exports = router;

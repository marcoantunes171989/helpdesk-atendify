const router = require('express').Router();
const auth   = require('../middleware/auth');
const wrap   = require('../middleware/asyncHandler');
const ctrl   = require('../controllers/dashboardController');

router.get('/stats',           auth, wrap(ctrl.stats));
router.get('/kpis',            auth, wrap(ctrl.kpis));
router.get('/volume',          auth, wrap(ctrl.volume));
router.get('/categories',      auth, wrap(ctrl.categories));
router.get('/sla-by-priority', auth, wrap(ctrl.slaByPriority));
router.get('/by-status',       auth, wrap(ctrl.byStatus));
router.get('/agents',          auth, wrap(ctrl.agents));
router.get('/queue/realtime',  auth, wrap(ctrl.queue));

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const requirePermission = require('../middleware/requirePermission');
const ctrl = require('../controllers/auditLogController');

router.get('/', auth, requirePermission('users.manage'), wrap(ctrl.list));

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/knowledgeController');

router.get('/', auth, wrap(ctrl.list));
router.get('/:id', auth, wrap(ctrl.get));
router.post('/', auth, wrap(ctrl.create));
router.post('/query', auth, wrap(ctrl.query));
router.put('/:id', auth, wrap(ctrl.update));
router.delete('/:id', auth, wrap(ctrl.remove));

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/ticketController');

router.get('/', auth, wrap(ctrl.list));
router.get('/:id', auth, wrap(ctrl.get));
router.post('/', auth, wrap(ctrl.create));
router.put('/:id', auth, wrap(ctrl.update));
router.delete('/:id', auth, wrap(ctrl.remove));
router.post('/:id/comments', auth, wrap(ctrl.addComment));
router.put('/:id/comments/:commentId', auth, wrap(ctrl.updateComment));

module.exports = router;

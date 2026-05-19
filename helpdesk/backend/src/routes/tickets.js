const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/ticketController');

router.get('/', auth, ctrl.list);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.post('/:id/comments', auth, ctrl.addComment);

module.exports = router;

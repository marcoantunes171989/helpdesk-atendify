const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/companyController');

router.get('/', auth, ctrl.list);
router.get('/:id/links', auth, ctrl.links);
router.get('/:id', auth, ctrl.get);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;

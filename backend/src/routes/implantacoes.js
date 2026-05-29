const router = require('express').Router();
const ctrl = require('../controllers/implantacaoController');
const auth = require('../middleware/auth');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/',              auth, wrap(ctrl.list));
router.get('/:id',           auth, wrap(ctrl.get));
router.post('/',             auth, wrap(ctrl.create));
router.put('/:id',           auth, wrap(ctrl.update));
router.put('/:id/fases/:faseId', auth, wrap(ctrl.updateFase));
router.delete('/:id',        auth, wrap(ctrl.remove));

module.exports = router;

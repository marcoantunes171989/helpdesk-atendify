const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/companyController');
const attCtrl = require('../controllers/companyAttachmentController');

router.get('/', auth, wrap(ctrl.list));
router.get('/:id/links', auth, wrap(ctrl.links));
router.get('/:id', auth, wrap(ctrl.get));
router.post('/', auth, wrap(ctrl.create));
router.put('/:id', auth, wrap(ctrl.update));
router.delete('/:id', auth, wrap(ctrl.remove));

router.get('/:companyId/attachments', auth, wrap(attCtrl.list));
router.post('/:companyId/attachments', auth, wrap(attCtrl.create));
router.get('/:companyId/attachments/:id/download', auth, wrap(attCtrl.download));
router.delete('/:companyId/attachments/:id', auth, wrap(attCtrl.remove));

module.exports = router;

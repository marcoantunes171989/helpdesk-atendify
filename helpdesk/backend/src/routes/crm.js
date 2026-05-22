const router = require('express').Router();
const auth = require('../middleware/auth');
const wrap = require('../middleware/asyncHandler');
const ctrl = require('../controllers/crmController');

// Contacts
router.get('/contacts', auth, wrap(ctrl.listContacts));
router.post('/contacts', auth, wrap(ctrl.createContact));
router.put('/contacts/:id', auth, wrap(ctrl.updateContact));
router.delete('/contacts/:id', auth, wrap(ctrl.removeContact));

// Opportunities
router.get('/opportunities', auth, wrap(ctrl.listOpportunities));
router.post('/opportunities', auth, wrap(ctrl.createOpportunity));
router.put('/opportunities/:id', auth, wrap(ctrl.updateOpportunity));
router.delete('/opportunities/:id', auth, wrap(ctrl.removeOpportunity));

// Activities
router.get('/activities', auth, wrap(ctrl.listActivities));
router.post('/activities', auth, wrap(ctrl.createActivity));
router.put('/activities/:id', auth, wrap(ctrl.updateActivity));
router.delete('/activities/:id', auth, wrap(ctrl.removeActivity));

module.exports = router;

const router = require('express').Router();
const ctrl   = require('../controllers/agendaTecnicaController');
const auth   = require('../middleware/auth');
const wrap   = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Stats
router.get('/stats', auth, wrap(ctrl.stats));

// Bulk import + clear all
router.post('/bulk',   auth, wrap(ctrl.bulkImport));
router.delete('/all',  auth, wrap(ctrl.clearAll));

// Visitas
router.get('/visitas',        auth, wrap(ctrl.listVisitas));
router.post('/visitas',       auth, wrap(ctrl.createVisita));
router.put('/visitas/:id',    auth, wrap(ctrl.updateVisita));
router.delete('/visitas/:id', auth, wrap(ctrl.removeVisita));

// Plantões
router.get('/plantoes',        auth, wrap(ctrl.listPlantoes));
router.post('/plantoes',       auth, wrap(ctrl.createPlantao));
router.put('/plantoes/:id',    auth, wrap(ctrl.updatePlantao));
router.delete('/plantoes/:id', auth, wrap(ctrl.removePlantao));

// Férias
router.get('/ferias',        auth, wrap(ctrl.listFerias));
router.post('/ferias',       auth, wrap(ctrl.createFerias));
router.put('/ferias/:id',    auth, wrap(ctrl.updateFerias));
router.delete('/ferias/:id', auth, wrap(ctrl.removeFerias));

// Técnicos
router.get('/tecnicos',        auth, wrap(ctrl.listTecnicos));
router.post('/tecnicos',       auth, wrap(ctrl.createTecnico));
router.put('/tecnicos/:id',    auth, wrap(ctrl.updateTecnico));
router.delete('/tecnicos/:id', auth, wrap(ctrl.removeTecnico));

module.exports = router;

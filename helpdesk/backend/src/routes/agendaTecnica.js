const router = require('express').Router();
const ctrl   = require('../controllers/agendaTecnicaController');
const auth   = require('../middleware/auth');
const { minRole } = require('../middleware/authorize');
const requirePermission = require('../middleware/requirePermission');
const wrap   = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Convertido de minRole('AGENT') para agenda_tecnica.* (ETAPA 4 do RBAC-03).
// Importação em massa e limpeza total continuam restritas a ADMIN (minRole).
// Stats
router.get('/stats', auth, requirePermission('agenda_tecnica.read'), wrap(ctrl.stats));

// Bulk import + clear all
router.post('/bulk',   auth, minRole('ADMIN'), wrap(ctrl.bulkImport));
router.delete('/all',  auth, minRole('ADMIN'), wrap(ctrl.clearAll));

// Visitas
router.get('/visitas',        auth, requirePermission('agenda_tecnica.read'), wrap(ctrl.listVisitas));
router.post('/visitas',       auth, requirePermission('agenda_tecnica.create'), wrap(ctrl.createVisita));
router.put('/visitas/:id',    auth, requirePermission('agenda_tecnica.update'), wrap(ctrl.updateVisita));
router.delete('/visitas/:id', auth, requirePermission('agenda_tecnica.delete'), wrap(ctrl.removeVisita));

// Plantões
router.get('/plantoes',        auth, requirePermission('agenda_tecnica.read'), wrap(ctrl.listPlantoes));
router.post('/plantoes',       auth, requirePermission('agenda_tecnica.create'), wrap(ctrl.createPlantao));
router.put('/plantoes/:id',    auth, requirePermission('agenda_tecnica.update'), wrap(ctrl.updatePlantao));
router.delete('/plantoes/:id', auth, requirePermission('agenda_tecnica.delete'), wrap(ctrl.removePlantao));

// Férias
router.get('/ferias',        auth, requirePermission('agenda_tecnica.read'), wrap(ctrl.listFerias));
router.post('/ferias',       auth, requirePermission('agenda_tecnica.create'), wrap(ctrl.createFerias));
router.put('/ferias/:id',    auth, requirePermission('agenda_tecnica.update'), wrap(ctrl.updateFerias));
router.delete('/ferias/:id', auth, requirePermission('agenda_tecnica.delete'), wrap(ctrl.removeFerias));

// Técnicos
router.get('/tecnicos',        auth, requirePermission('agenda_tecnica.read'), wrap(ctrl.listTecnicos));
router.post('/tecnicos',       auth, requirePermission('agenda_tecnica.create'), wrap(ctrl.createTecnico));
router.put('/tecnicos/:id',    auth, requirePermission('agenda_tecnica.update'), wrap(ctrl.updateTecnico));
router.delete('/tecnicos/:id', auth, requirePermission('agenda_tecnica.delete'), wrap(ctrl.removeTecnico));

module.exports = router;

const express = require('express');
const asyncHandler = require('../middleware/asynchandler');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');
const controller = require('../controllers/catalogo.controller');

const router = express.Router();
router.use(verificarToken);

router.get('/servicios', asyncHandler(controller.listarServicios));
router.post('/servicios', exigirRol('Admin', 'Barbero'), asyncHandler(controller.crearServicio));
router.put('/servicios/:id', exigirRol('Admin', 'Barbero'), asyncHandler(controller.actualizarServicio));
router.post('/solicitudes-servicio', exigirRol('Barbero'), asyncHandler(controller.solicitarServicio));
router.get('/solicitudes-servicio', exigirRol('Admin', 'Barbero'), asyncHandler(controller.listarSolicitudes));
router.patch('/solicitudes-servicio/:id', exigirRol('Admin'), asyncHandler(controller.resolverSolicitud));
router.get('/galeria/:peluqueriaId', asyncHandler(controller.listarGaleria));
router.post('/galeria', exigirRol('Admin', 'Barbero'), asyncHandler(controller.agregarGaleria));
router.delete('/galeria/:id', exigirRol('Admin', 'Barbero'), asyncHandler(controller.eliminarGaleria));

module.exports = router;

/**
 * Rutas del panel del peluquero (barbero).
 * Gestiona su perfil, su peluquería, las citas del día y la galería de obras.
 */
const express = require('express');
const router = express.Router();
const barbero = require('../controllers/barbero.controller');
const cliente = require('../controllers/cliente.controller');
const { exigirRol, protegerCSRF } = require('../middleware/sesion');
const { subirFoto, subirImagen } = require('../middleware/subida');
const asyncHandler = require('../middleware/errores').asyncHandler;

// Todo el panel exige CSRF y el rol Barbero.
router.use(protegerCSRF);
router.use(exigirRol('Barbero'));

// Perfil y configuración del peluquero (con subida de foto).
router.get('/', asyncHandler(barbero.dashboard));
router.get('/perfil', asyncHandler(barbero.perfil));
router.post('/perfil', subirFoto, asyncHandler(barbero.perfil));
router.get('/configuracion', asyncHandler(barbero.configuracion));
router.post('/configuracion', subirFoto, asyncHandler(barbero.configuracion));
// Notificaciones del peluquero.
router.get('/notificaciones', asyncHandler(cliente.notificaciones));
router.post('/notificaciones/leidas', asyncHandler(cliente.marcarNotificacionesLeidas));
// Citas: creación manual y cambio de estado.
router.get('/nueva-cita', asyncHandler(barbero.crearCita));
router.post('/nueva-cita', asyncHandler(barbero.crearCita));
router.post('/citas/:id/estado', asyncHandler(barbero.cambiarEstadoCita));
// Ficha de la peluquería y su galería de imágenes.
router.get('/peluqueria', asyncHandler(barbero.editarPeluqueria));
router.post('/peluqueria', subirImagen, asyncHandler(barbero.editarPeluqueria));
router.get('/galeria', asyncHandler(barbero.galeria));
router.post('/galeria', subirImagen, asyncHandler(barbero.agregarImagen));
router.post('/galeria/:id/eliminar', asyncHandler(barbero.eliminarImagen));

module.exports = router;

/**
 * Rutas de la cuenta del cliente (área privada).
 * Perfil, notificaciones, reservas de citas y carrito de la tienda.
 */
const express = require('express');
const router = express.Router();
const cliente = require('../controllers/cliente.controller');
const cita = require('../controllers/cita.controller');
const carrito = require('../controllers/carrito.controller');
const { exigirRol, exigirSesion, protegerCSRF } = require('../middleware/sesion');
const { subirFoto } = require('../middleware/subida');
const asyncHandler = require('../middleware/errores').asyncHandler;

// Toda la cuenta exige sesión iniciada y protección CSRF.
router.use(protegerCSRF);
router.use(exigirSesion);

// Perfil y configuración del cliente
router.get('/perfil', exigirRol('Cliente', 'Admin'), asyncHandler(cliente.perfil));
router.post('/perfil', exigirRol('Cliente', 'Admin'), subirFoto, asyncHandler(cliente.actualizarPerfil));
router.get('/configuracion', exigirRol('Cliente'), asyncHandler(cliente.configuracion));
router.post('/configuracion', exigirRol('Cliente'), subirFoto, asyncHandler(cliente.configuracion));
router.get('/notificaciones', asyncHandler(cliente.notificaciones));
router.post('/notificaciones/leidas', asyncHandler(cliente.marcarNotificacionesLeidas));
router.get('/cambiar-password', asyncHandler(cliente.cambiarPassword));
router.post('/cambiar-password', asyncHandler(cliente.cambiarPassword));

// Citas del cliente
router.get('/reservar-cita', exigirRol('Cliente'), asyncHandler(cita.reservarCita));
router.post('/pre-confirmar', exigirRol('Cliente'), asyncHandler(cita.preConfirmar));
router.post('/confirmar-reserva', exigirRol('Cliente'), asyncHandler(cita.confirmarReserva));
router.get('/editar-reserva/:id', exigirRol('Cliente'), asyncHandler(cita.editarReserva));
router.post('/editar-reserva/:id', exigirRol('Cliente'), asyncHandler(cita.actualizarReserva));
router.post('/cancelar-reserva/:id', exigirRol('Cliente'), asyncHandler(cita.cancelarReserva));
router.post('/confirmar-cita/:id', exigirRol('Cliente'), asyncHandler(cita.confirmarCita));
router.post('/calificar/:id', exigirRol('Cliente'), asyncHandler(cita.calificar));

// Carrito y pedidos
router.get('/carrito', asyncHandler(carrito.verCarrito));
router.post('/carrito/agregar/:id', asyncHandler(carrito.agregar));
router.post('/carrito/actualizar/:id', asyncHandler(carrito.actualizar));
router.post('/carrito/eliminar/:id', asyncHandler(carrito.eliminar));
router.get('/carrito/finalizar', exigirRol('Cliente'), asyncHandler(carrito.finalizar));
router.post('/carrito/finalizar', exigirRol('Cliente'), asyncHandler(carrito.finalizar));
router.get('/pedido-exitoso/:id', exigirRol('Cliente'), asyncHandler(carrito.pedidoExitoso));

module.exports = router;

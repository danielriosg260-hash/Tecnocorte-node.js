/**
 * Rutas del panel de administración de TecnoCorte.
 * CRUD de usuarios, peluqueros, reservas, peluquerías, productos, pedidos,
 * horarios, galería y auditoría: todo reservado al rol Admin.
 */
const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const cita = require('../controllers/cita.controller');
const cliente = require('../controllers/cliente.controller');
const { exigirRol, protegerCSRF } = require('../middleware/sesion');
const { subirFoto, subirImagen } = require('../middleware/subida');
const asyncHandler = require('../middleware/errores').asyncHandler;

// Middlewares de todo el panel: primero el control CSRF y después solo Admin.
router.use(protegerCSRF);
router.use(exigirRol('Admin'));

// Panel
router.get('/', asyncHandler(admin.dashboard));
router.get('/perfil', asyncHandler(admin.perfil));
router.post('/perfil', subirFoto, asyncHandler(admin.perfil));
router.get('/notificaciones', asyncHandler(admin.notificaciones));
router.post('/notificaciones/leidas', asyncHandler(cliente.marcarNotificacionesLeidas));
router.get('/cambiar-password', asyncHandler(cliente.cambiarPassword));
router.post('/cambiar-password', asyncHandler(cliente.cambiarPassword));

// Usuarios
router.get('/usuarios', asyncHandler(admin.usuarios));
router.get('/usuarios/nuevo', asyncHandler(admin.formularioUsuario));
router.post('/usuarios/nuevo', subirFoto, asyncHandler(admin.guardarUsuario));
router.get('/usuarios/:id/editar', asyncHandler(admin.formularioUsuario));
router.post('/usuarios/:id/editar', subirFoto, asyncHandler(admin.guardarUsuario));
router.post('/usuarios/:id/suspender', asyncHandler(admin.suspenderUsuario));
router.post('/usuarios/:id/eliminar', asyncHandler(admin.eliminarUsuario));
router.post('/usuarios/:id/quitar-foto', asyncHandler(admin.quitarFotoUsuario));

// Barberos
router.get('/peluqueros', asyncHandler(admin.peluqueros));
router.get('/peluqueros/nuevo', asyncHandler(admin.formularioPeluquero));
router.post('/peluqueros/nuevo', subirFoto, asyncHandler(admin.guardarPeluquero));
router.get('/peluqueros/:id/editar', asyncHandler(admin.formularioPeluquero));
router.post('/peluqueros/:id/editar', subirFoto, asyncHandler(admin.guardarPeluquero));
router.post('/peluqueros/:id/eliminar', asyncHandler(admin.eliminarPeluquero));
router.post('/peluqueros/:id/quitar-foto', asyncHandler(admin.quitarFotoUsuario));

// Citas
router.get('/reservas', asyncHandler(admin.reservas));
router.get('/reservas/nueva', asyncHandler(admin.formularioReserva));
router.post('/reservas/nueva', asyncHandler(admin.guardarReserva));
router.get('/reservas/:id/editar', asyncHandler(admin.formularioReserva));
router.post('/reservas/:id/editar', asyncHandler(admin.guardarReserva));
router.post('/reservas/:id/cancelar', asyncHandler(admin.cancelarReserva));
router.post('/reservas/:id/eliminar', asyncHandler(admin.eliminarReserva));

// Barberías
router.get('/peluquerias', asyncHandler(admin.peluquerias));
router.get('/peluquerias/nueva', asyncHandler(admin.formularioPeluqueria));
router.post('/peluquerias/nueva', subirImagen, asyncHandler(admin.guardarPeluqueria));
router.get('/peluquerias/:id/editar', asyncHandler(admin.formularioPeluqueria));
router.post('/peluquerias/:id/editar', subirImagen, asyncHandler(admin.guardarPeluqueria));
router.post('/peluquerias/:id/eliminar', asyncHandler(admin.eliminarPeluqueria));
router.post('/peluquerias/:id/quitar-foto', asyncHandler(admin.quitarFotoPeluqueria));

// Productos
router.get('/productos', asyncHandler(admin.productos));
router.get('/productos/nuevo', asyncHandler(admin.formularioProducto));
router.post('/productos/nuevo', subirImagen, asyncHandler(admin.guardarProducto));
router.get('/productos/:id/editar', asyncHandler(admin.formularioProducto));
router.post('/productos/:id/editar', subirImagen, asyncHandler(admin.guardarProducto));
router.post('/productos/:id/eliminar', asyncHandler(admin.eliminarProducto));
router.post('/productos/:id/quitar-imagen', asyncHandler(admin.quitarImagenProducto));

// Pedidos
router.get('/pedidos', asyncHandler(admin.pedidos));
router.post('/pedidos/:id', asyncHandler(admin.actualizarPedido));

// Horarios y bloqueos
router.get('/horarios', asyncHandler(admin.horarios));
router.post('/horarios', asyncHandler(admin.horarios));
router.post('/horarios/bloqueos/:id/eliminar', asyncHandler(admin.eliminarBloqueo));

// Mensajes, ingresos y galería
router.get('/mensajes', asyncHandler(admin.mensajes));
router.get('/ingresos', asyncHandler(admin.ingresos));
router.get('/galeria', asyncHandler(admin.galeria));
router.post('/galeria/:id/eliminar', asyncHandler(admin.eliminarImagenGaleria));

// Solicitudes de servicios
router.get('/solicitudes-servicios', asyncHandler(admin.solicitudesServicios));
router.post('/solicitudes-servicios', asyncHandler(admin.solicitudesServicios));

// Auditoría
router.get('/acciones', asyncHandler(admin.acciones));
router.get('/errores', asyncHandler(admin.errores));
router.post('/errores', asyncHandler(admin.errores));

// Configuración e inicio
router.get('/configuracion', asyncHandler(admin.configuracion));
router.post('/configuracion', asyncHandler(admin.configuracion));
router.get('/editar-inicio', asyncHandler(admin.editarInicio));
router.post('/editar-inicio', asyncHandler(admin.editarInicio));

// Reportes
router.get('/exportar/reservas', asyncHandler(admin.exportarReservas));
router.get('/exportar/pedidos', asyncHandler(admin.exportarPedidos));

module.exports = router;

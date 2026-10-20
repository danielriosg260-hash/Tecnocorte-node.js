const express = require('express');
const router = express.Router();
const publico = require('../controllers/publico.controller');
const auth = require('../controllers/auth.controller');
const tienda = require('../controllers/tienda.controller');
const { exigirSesion } = require('../middleware/sesion');
const { protegerCSRF } = require('../middleware/sesion');
const limitarLogin = require('../middleware/ratelimit');
const { limitarVerificacion, limitarReenvio, limitarRecuperacion } = limitarLogin;
const asyncHandler = require('../middleware/errores').asyncHandler;

router.use(protegerCSRF);

// Páginas públicas
router.get('/', asyncHandler(publico.inicio));
router.get('/como-funciona', asyncHandler(publico.comoFunciona));
router.get('/sobre-nosotros', asyncHandler(publico.sobreNosotros));
router.get('/politicas', asyncHandler(publico.politicas));
router.get('/servicios', asyncHandler(publico.servicios));
router.get('/peluquerias', asyncHandler(publico.peluquerias));
router.get('/peluquerias/:id', asyncHandler(publico.detallePeluqueria));
router.get('/tienda', asyncHandler(tienda.tienda));
router.get('/tienda/:id', asyncHandler(tienda.detalleProducto));

// Contacto
router.get('/ayuda', asyncHandler(publico.mostrarAyuda));
router.post('/ayuda', asyncHandler(publico.ayuda));

// Sesión
router.get('/login', (req, res) => auth.mostrarLogin(req, res));
router.post('/login', limitarLogin, asyncHandler(auth.iniciarSesion));
router.get('/registro', asyncHandler(auth.mostrarRegistro));
router.post('/registro', asyncHandler(auth.registrar));
router.post('/logout', auth.salir);
router.get('/verificar-email', (req, res) => auth.mostrarVerificacion(req, res));
router.post('/verificar-email', limitarVerificacion, asyncHandler(auth.verificarEmail));
router.post('/verificar-email/reenviar', limitarReenvio, asyncHandler(auth.reenviarVerificacion));
router.get('/recuperar-password', (req, res) => auth.mostrarRecuperar(req, res));
router.post('/recuperar-password', limitarRecuperacion, asyncHandler(auth.solicitarRecuperacion));
router.get('/restablecer-password/:token', asyncHandler(auth.mostrarRestablecer));
router.post('/restablecer-password/:token', asyncHandler(auth.restablecerPassword));

// Reseña escrita desde la portada
router.post('/resenas', exigirSesion, asyncHandler(publico.dejarResena));

module.exports = router;

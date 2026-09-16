const express = require('express');
const router = express.Router();
const authController = require('../controllers/Auth.controller');
const verificarToken = require('../middleware/auth');
const limitarLogin = require('../middleware/rateLimit');
const { limitarVerificacion } = limitarLogin;

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Registro de usuario nuevo
router.post('/registro', authController.registro);
router.post('/verificar-email', limitarVerificacion, authController.verificarEmail);

// Inicio de sesión
router.post('/login', limitarLogin, authController.login);

router.post('/logout', authController.logout);

// Ver perfil (protegida con token)
router.get('/perfil', verificarToken, authController.perfil);

module.exports = router;

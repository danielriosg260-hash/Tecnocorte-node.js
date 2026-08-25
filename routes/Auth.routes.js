const express = require('express');
const router = express.Router();
const authController = require('../controllers/Auth.controller');
const verificarToken = require('../middleware/auth');

// Registro de usuario nuevo
router.post('/registro', authController.registro);

// Inicio de sesión
router.post('/login', authController.login);

// Ver perfil (protegida con token)
router.get('/perfil', verificarToken, authController.perfil);

module.exports = router;

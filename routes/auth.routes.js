const express = require('express');
const router = express.Router();
const apiauth = require('../controllers/apiauth.controller');
const verificarToken = require('../middleware/auth');
const limitarLogin = require('../middleware/ratelimit');
const { limitarVerificacion } = limitarLogin;

// La API nunca debe quedar en la caché del navegador.
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.post('/registro', limitarVerificacion, apiauth.registro);
router.post('/login', limitarLogin, apiauth.login);
router.post('/logout', apiauth.logout);
router.get('/perfil', verificarToken, apiauth.perfil);

module.exports = router;

const express = require('express');
const asyncHandler = require('../middleware/asynchandler');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');
const controller = require('../controllers/configuracion.controller');

const router = express.Router();
router.use(verificarToken);
router.get('/', asyncHandler(controller.obtener));
router.put('/', exigirRol('Admin'), asyncHandler(controller.actualizar));

module.exports = router;

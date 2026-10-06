const express = require('express');
const router = express.Router();
const peluqueriaController = require('../controllers/Peluqueria.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

router.get('/', peluqueriaController.listarTodos);

router.get('/:id', peluqueriaController.listarUno);

router.post('/', exigirRol('Admin'), peluqueriaController.crear);

router.put('/:id', exigirRol('Admin'), peluqueriaController.actualizar);

router.delete('/:id', exigirRol('Admin'), peluqueriaController.eliminar);

module.exports = router;

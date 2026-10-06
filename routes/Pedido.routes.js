const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/Pedido.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

router.get('/', exigirRol('Admin'), pedidoController.listarTodos);

router.get('/:id', exigirRol('Admin'), pedidoController.listarUno);

router.post('/', exigirRol('Admin'), pedidoController.crear);

router.put('/:id', exigirRol('Admin'), pedidoController.actualizar);

router.delete('/:id', exigirRol('Admin'), pedidoController.eliminar);

module.exports = router;

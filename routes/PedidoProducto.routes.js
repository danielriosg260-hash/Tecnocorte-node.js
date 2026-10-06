const express = require('express');
const router = express.Router();
const pedidoProductoController = require('../controllers/PedidoProducto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

router.get('/', exigirRol('Admin'), pedidoProductoController.listarTodos);

router.get('/:id', exigirRol('Admin'), pedidoProductoController.listarUno);

router.post('/', exigirRol('Admin'), pedidoProductoController.crear);

router.put('/:id', exigirRol('Admin'), pedidoProductoController.actualizar);

router.delete('/:id', exigirRol('Admin'), pedidoProductoController.eliminar);

module.exports = router;

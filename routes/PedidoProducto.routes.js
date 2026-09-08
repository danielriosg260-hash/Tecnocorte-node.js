const express = require('express');
const router = express.Router();
const pedidoProductoController = require('../controllers/PedidoProducto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

// Rutas de PedidoProducto: cada ruta enlaza una dirección con una función del controlador.

//lista todas las líneas de pedido
router.get('/', exigirRol('Admin'), pedidoProductoController.listarTodos);

//busca una línea de pedido por su id
router.get('/:id', exigirRol('Admin'), pedidoProductoController.listarUno);

//crea una línea de pedido nueva
router.post('/', exigirRol('Admin'), pedidoProductoController.crear);

//actualiza una línea de pedido
router.put('/:id', exigirRol('Admin'), pedidoProductoController.actualizar);

//elimina una línea de pedido
router.delete('/:id', exigirRol('Admin'), pedidoProductoController.eliminar);

module.exports = router;

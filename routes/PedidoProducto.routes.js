const express = require('express');
const router = express.Router();
const pedidoProductoController = require('../controllers/PedidoProducto.controller');

// Rutas de PedidoProducto: cada ruta enlaza una dirección con una función del controlador.

//lista todas las líneas de pedido
router.get('/', pedidoProductoController.listarTodos);

//busca una línea de pedido por su id
router.get('/:id', pedidoProductoController.listarUno);

//crea una línea de pedido nueva
router.post('/', pedidoProductoController.crear);

//actualiza una línea de pedido
router.put('/:id', pedidoProductoController.actualizar);

//elimina una línea de pedido
router.delete('/:id', pedidoProductoController.eliminar);

module.exports = router;

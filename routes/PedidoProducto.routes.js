const express = require('express');
const router = express.Router();
const pedidoProductoController = require('../controllers/PedidoProducto.controller');

// Rutas de PedidoProducto: cada ruta enlaza una dirección con una función del controlador.

// GET /api/pedidos-producto -> lista todas las líneas de pedido
router.get('/', pedidoProductoController.listarTodos);

// GET /api/pedidos-producto/:id -> busca una línea de pedido por su id
router.get('/:id', pedidoProductoController.listarUno);

// POST /api/pedidos-producto -> crea una línea de pedido nueva
router.post('/', pedidoProductoController.crear);

// PUT /api/pedidos-producto/:id -> actualiza una línea de pedido
router.put('/:id', pedidoProductoController.actualizar);

// DELETE /api/pedidos-producto/:id -> elimina una línea de pedido
router.delete('/:id', pedidoProductoController.eliminar);

module.exports = router;

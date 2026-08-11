const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/Pedido.controller');

// Rutas de Pedido: cada ruta enlaza una dirección con una función del controlador.

// GET /api/pedidos -> lista todos los pedidos
router.get('/', pedidoController.listarTodos);

// GET /api/pedidos/:id -> busca un pedido por su id
router.get('/:id', pedidoController.listarUno);

// POST /api/pedidos -> crea un pedido nuevo
router.post('/', pedidoController.crear);

// PUT /api/pedidos/:id -> actualiza un pedido
router.put('/:id', pedidoController.actualizar);

// DELETE /api/pedidos/:id -> elimina un pedido
router.delete('/:id', pedidoController.eliminar);

module.exports = router;

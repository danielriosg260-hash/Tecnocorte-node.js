const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/Pedido.controller');

// Rutas de Pedido: cada ruta enlaza una dirección con una función del controlador.

//lista todos los pedidos
router.get('/', pedidoController.listarTodos);

//busca un pedido por su id
router.get('/:id', pedidoController.listarUno);

//crea un pedido nuevo
router.post('/', pedidoController.crear);

//actualiza un pedido
router.put('/:id', pedidoController.actualizar);

//elimina un pedido
router.delete('/:id', pedidoController.eliminar);

module.exports = router;

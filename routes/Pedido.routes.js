const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/Pedido.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

// Rutas de Pedido: cada ruta enlaza una dirección con una función del controlador.

//lista todos los pedidos
router.get('/', exigirRol('Admin'), pedidoController.listarTodos);

//busca un pedido por su id
router.get('/:id', exigirRol('Admin'), pedidoController.listarUno);

//crea un pedido nuevo
router.post('/', exigirRol('Admin'), pedidoController.crear);

//actualiza un pedido
router.put('/:id', exigirRol('Admin'), pedidoController.actualizar);

//elimina un pedido
router.delete('/:id', exigirRol('Admin'), pedidoController.eliminar);

module.exports = router;

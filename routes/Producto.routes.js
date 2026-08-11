const express = require('express');
const router = express.Router();
const productoController = require('../controllers/Producto.controller');

// Rutas de Producto: cada ruta enlaza una dirección con una función del controlador.

//lista todos los productos
router.get('/', productoController.listarTodos);

//busca un producto por su id
router.get('/:id', productoController.listarUno);

//crea un producto nuevo
router.post('/', productoController.crear);

//actualiza un producto
router.put('/:id', productoController.actualizar);

//elimina un producto
router.delete('/:id', productoController.eliminar);

module.exports = router;

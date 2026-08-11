const express = require('express');
const router = express.Router();
const productoController = require('../controllers/Producto.controller');

// Rutas de Producto: cada ruta enlaza una dirección con una función del controlador.

// GET /api/productos -> lista todos los productos
router.get('/', productoController.listarTodos);

// GET /api/productos/:id -> busca un producto por su id
router.get('/:id', productoController.listarUno);

// POST /api/productos -> crea un producto nuevo
router.post('/', productoController.crear);

// PUT /api/productos/:id -> actualiza un producto
router.put('/:id', productoController.actualizar);

// DELETE /api/productos/:id -> elimina un producto
router.delete('/:id', productoController.eliminar);

module.exports = router;

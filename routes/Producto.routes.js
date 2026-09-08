const express = require('express');
const router = express.Router();
const productoController = require('../controllers/Producto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

// Rutas de Producto: cada ruta enlaza una dirección con una función del controlador.

//lista todos los productos
router.get('/', productoController.listarTodos);

//busca un producto por su id
router.get('/:id', productoController.listarUno);

//crea un producto nuevo
router.post('/', exigirRol('Admin'), productoController.crear);

//actualiza un producto
router.put('/:id', exigirRol('Admin'), productoController.actualizar);

//elimina un producto
router.delete('/:id', exigirRol('Admin'), productoController.eliminar);

module.exports = router;

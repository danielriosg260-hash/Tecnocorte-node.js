const express = require('express');
const router = express.Router();
const productoController = require('../controllers/Producto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

router.get('/', productoController.listarTodos);

router.get('/:id', productoController.listarUno);

router.post('/', exigirRol('Admin'), productoController.crear);

router.put('/:id', exigirRol('Admin'), productoController.actualizar);

router.delete('/:id', exigirRol('Admin'), productoController.eliminar);

module.exports = router;

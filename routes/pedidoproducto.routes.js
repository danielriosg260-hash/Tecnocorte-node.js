/**
 * Rutas de la API de pedidos de producto (tienda).
 * Lectura con token, escritura solo para Admin.
 */
const express = require('express');
const router = express.Router();
const pedidoProductoController = require('../controllers/pedidoproducto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

// Toda la colección pide token JWT.
router.use(verificarToken);

// Lectura para cualquier usuario autenticado.
router.get('/', pedidoProductoController.find);
router.get('/:id', pedidoProductoController.findOne);
// Alta, edición y borrado solo para Admin.
router.post('/', exigirRol('Admin'), pedidoProductoController.insertOne);
router.put('/:id', exigirRol('Admin'), pedidoProductoController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), pedidoProductoController.findOneAndDelete);

module.exports = router;

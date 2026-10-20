/**
 * Rutas de la API de pedidos: consulta con token, alta de cualquiera
 * autenticado y modificación/borrado reservados a Admin.
 */
const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

// Toda la colección pide token JWT.
router.use(verificarToken);

// Lectura para cualquier usuario autenticado.
router.get('/', pedidoController.find);
router.get('/:id', pedidoController.findOne);
router.post('/', pedidoController.insertOne);
// Escritura destructiva solo para Admin.
router.put('/:id', exigirRol('Admin'), pedidoController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), pedidoController.findOneAndDelete);

module.exports = router;

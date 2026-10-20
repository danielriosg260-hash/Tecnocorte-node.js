/**
 * Rutas de la API de productos: listado público y CRUD reservado a Admin.
 */
const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

// Rutas públicas: se pueden consultar sin token.
router.get('/', productoController.find);
router.get('/:id', productoController.findOne);

// A partir de aquí hace falta token, y para escribir el rol Admin.
router.use(verificarToken);
router.post('/', exigirRol('Admin'), productoController.insertOne);
router.put('/:id', exigirRol('Admin'), productoController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), productoController.findOneAndDelete);

module.exports = router;

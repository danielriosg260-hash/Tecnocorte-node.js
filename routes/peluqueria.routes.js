/**
 * Rutas de la API de peluquerías: listado público y CRUD reservado a Admin.
 */
const express = require('express');
const router = express.Router();
const peluqueriaController = require('../controllers/peluqueria.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

// Rutas públicas: se pueden consultar sin token.
router.get('/', peluqueriaController.find);
router.get('/:id', peluqueriaController.findOne);

// A partir de aquí hace falta token, y para escribir el rol Admin.
router.use(verificarToken);
router.post('/', exigirRol('Admin'), peluqueriaController.insertOne);
router.put('/:id', exigirRol('Admin'), peluqueriaController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), peluqueriaController.findOneAndDelete);

module.exports = router;

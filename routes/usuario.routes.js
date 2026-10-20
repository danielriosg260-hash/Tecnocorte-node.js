/**
 * Rutas de la API de usuarios: CRUD completo reservado al Admin.
 */
const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

// Token obligatorio y solo rol Admin en todo el archivo.
router.use(verificarToken);
router.use(exigirRol('Admin'));

router.get('/', usuarioController.find);
router.get('/:id', usuarioController.findOne);
router.post('/', usuarioController.insertOne);
router.put('/:id', usuarioController.findOneAndUpdate);
router.delete('/:id', usuarioController.findOneAndDelete);

module.exports = router;

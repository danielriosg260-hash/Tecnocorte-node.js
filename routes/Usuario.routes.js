const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/Usuario.controller');

// Rutas de Usuario: cada ruta enlaza una dirección con una función del controlador.

// GET /api/usuarios -> lista todos los usuarios
router.get('/', usuarioController.listarTodos);

// GET /api/usuarios/:id -> busca un usuario por su id
router.get('/:id', usuarioController.listarUno);

// POST /api/usuarios -> crea un usuario nuevo
router.post('/', usuarioController.crear);

// PUT /api/usuarios/:id -> actualiza un usuario
router.put('/:id', usuarioController.actualizar);

// DELETE /api/usuarios/:id -> elimina un usuario
router.delete('/:id', usuarioController.eliminar);

module.exports = router;

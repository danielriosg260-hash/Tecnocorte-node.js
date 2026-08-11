const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/Usuario.controller');

//cada ruta enlaza una dirección con una función del controlador.

//lista todos los usuarios
router.get('/', usuarioController.listarTodos);

//busca un usuario por su id
router.get('/:id', usuarioController.listarUno);

//crea un usuario nuevo
router.post('/', usuarioController.crear);

//actualiza un usuario
router.put('/:id', usuarioController.actualizar);

//elimina un usuario
router.delete('/:id', usuarioController.eliminar);

module.exports = router;

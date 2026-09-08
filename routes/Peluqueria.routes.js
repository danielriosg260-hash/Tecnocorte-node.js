const express = require('express');
const router = express.Router();
const peluqueriaController = require('../controllers/Peluqueria.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

// Rutas de Peluqueria: cada ruta enlaza una dirección con una función del controlador.

//lista todas las peluquerías
router.get('/', peluqueriaController.listarTodos);

//busca una peluquería por su id
router.get('/:id', peluqueriaController.listarUno);

// crea una peluquería nueva
router.post('/', exigirRol('Admin'), peluqueriaController.crear);

//actualiza una peluquería
router.put('/:id', exigirRol('Admin'), peluqueriaController.actualizar);

//elimina una peluquería
router.delete('/:id', exigirRol('Admin'), peluqueriaController.eliminar);

module.exports = router;

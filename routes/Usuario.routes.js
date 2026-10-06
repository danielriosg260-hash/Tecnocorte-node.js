const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/Usuario.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);
router.use(exigirRol('Admin'));

router.get('/', usuarioController.listarTodos);

router.get('/:id', usuarioController.listarUno);

router.post('/', usuarioController.crear);

router.put('/:id', usuarioController.actualizar);

router.delete('/:id', usuarioController.eliminar);

module.exports = router;

const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reserva.controller');
const verificarToken = require('../middleware/auth');

router.use(verificarToken);

router.get('/', reservaController.listarTodos);

router.get('/:id', reservaController.listarUno);

router.post('/', reservaController.crear);

router.put('/:id', reservaController.actualizar);

router.delete('/:id', reservaController.eliminar);

module.exports = router;

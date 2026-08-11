const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/Reserva.controller');

// Rutas de Reserva: cada ruta enlaza una dirección con una función del controlador.

//lista todas las reservas
router.get('/', reservaController.listarTodos);

//busca una reserva por su id
router.get('/:id', reservaController.listarUno);

//crea una reserva nueva
router.post('/', reservaController.crear);

//actualiza una reserva
router.put('/:id', reservaController.actualizar);

//elimina una reserva
router.delete('/:id', reservaController.eliminar);

module.exports = router;

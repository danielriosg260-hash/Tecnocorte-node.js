const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/Reserva.controller');

// Rutas de Reserva: cada ruta enlaza una dirección con una función del controlador.

// GET /api/reservas -> lista todas las reservas
router.get('/', reservaController.listarTodos);

// GET /api/reservas/:id -> busca una reserva por su id
router.get('/:id', reservaController.listarUno);

// POST /api/reservas -> crea una reserva nueva
router.post('/', reservaController.crear);

// PUT /api/reservas/:id -> actualiza una reserva
router.put('/:id', reservaController.actualizar);

// DELETE /api/reservas/:id -> elimina una reserva
router.delete('/:id', reservaController.eliminar);

module.exports = router;

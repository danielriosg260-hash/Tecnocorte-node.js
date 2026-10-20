/**
 * Rutas de la API de reservas: CRUD completo exigiendo token.
 * (No aplica control de roles dentro de este archivo.)
 */
const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reserva.controller');
const verificarToken = require('../middleware/auth');

// Toda la colección pide token JWT.
router.use(verificarToken);

router.get('/', reservaController.find);
router.get('/:id', reservaController.findOne);
router.post('/', reservaController.insertOne);
router.put('/:id', reservaController.findOneAndUpdate);
router.delete('/:id', reservaController.findOneAndDelete);

module.exports = router;

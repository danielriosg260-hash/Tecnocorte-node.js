const express = require('express');
const router = express.Router();
const peluqueriaController = require('../controllers/Peluqueria.controller');

// Rutas de Peluqueria: cada ruta enlaza una dirección con una función del controlador.

// GET /api/peluquerias -> lista todas las peluquerías
router.get('/', peluqueriaController.listarTodos);

// GET /api/peluquerias/:id -> busca una peluquería por su id
router.get('/:id', peluqueriaController.listarUno);

// POST /api/peluquerias -> crea una peluquería nueva
router.post('/', peluqueriaController.crear);

// PUT /api/peluquerias/:id -> actualiza una peluquería
router.put('/:id', peluqueriaController.actualizar);

// DELETE /api/peluquerias/:id -> elimina una peluquería
router.delete('/:id', peluqueriaController.eliminar);

module.exports = router;

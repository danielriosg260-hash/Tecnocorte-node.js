const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reserva.controller');
const verificarToken = require('../middleware/auth');

router.use(verificarToken);

router.get('/', reservaController.find);
router.get('/:id', reservaController.findOne);
router.post('/', reservaController.insertOne);
router.put('/:id', reservaController.findOneAndUpdate);
router.delete('/:id', reservaController.findOneAndDelete);

module.exports = router;

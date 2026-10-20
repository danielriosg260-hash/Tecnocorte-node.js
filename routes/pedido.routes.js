const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedido.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

router.get('/', pedidoController.find);
router.get('/:id', pedidoController.findOne);
router.post('/', pedidoController.insertOne);
router.put('/:id', exigirRol('Admin'), pedidoController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), pedidoController.findOneAndDelete);

module.exports = router;

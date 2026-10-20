const express = require('express');
const router = express.Router();
const pedidoProductoController = require('../controllers/pedidoproducto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.use(verificarToken);

router.get('/', pedidoProductoController.find);
router.get('/:id', pedidoProductoController.findOne);
router.post('/', exigirRol('Admin'), pedidoProductoController.insertOne);
router.put('/:id', exigirRol('Admin'), pedidoProductoController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), pedidoProductoController.findOneAndDelete);

module.exports = router;

const express = require('express');
const router = express.Router();
const productoController = require('../controllers/producto.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.get('/', productoController.find);
router.get('/:id', productoController.findOne);

router.use(verificarToken);
router.post('/', exigirRol('Admin'), productoController.insertOne);
router.put('/:id', exigirRol('Admin'), productoController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), productoController.findOneAndDelete);

module.exports = router;

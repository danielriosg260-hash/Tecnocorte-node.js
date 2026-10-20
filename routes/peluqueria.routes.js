const express = require('express');
const router = express.Router();
const peluqueriaController = require('../controllers/peluqueria.controller');
const verificarToken = require('../middleware/auth');
const exigirRol = require('../middleware/roles');

router.get('/', peluqueriaController.find);
router.get('/:id', peluqueriaController.findOne);

router.use(verificarToken);
router.post('/', exigirRol('Admin'), peluqueriaController.insertOne);
router.put('/:id', exigirRol('Admin'), peluqueriaController.findOneAndUpdate);
router.delete('/:id', exigirRol('Admin'), peluqueriaController.findOneAndDelete);

module.exports = router;

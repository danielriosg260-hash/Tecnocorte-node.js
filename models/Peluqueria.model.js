const mongoose = require('mongoose');

const peluqueriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  ubicacion: { type: String, required: true },
  telefono: { type: String }
}, { timestamps: true });

const Peluqueria = mongoose.model('Peluqueria', peluqueriaSchema);

module.exports = Peluqueria;
const mongoose = require('mongoose');

// Modelo de Peluquería que define la estructura de los datos del establecimiento en MongoDB,
// incluyendo su información básica como nombre, ubicación y teléfono.
// También registra automáticamente las fechas de creación y actualización.
const peluqueriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  ubicacion: { type: String, required: true },
  telefono: { type: String }
}, { timestamps: true });

const Peluqueria = mongoose.model('Peluqueria', peluqueriaSchema);

module.exports = Peluqueria;
const mongoose = require('mongoose');

const ingresoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  rol: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  ip: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Ingreso', ingresoSchema);

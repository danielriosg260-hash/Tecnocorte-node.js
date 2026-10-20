const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  descripcion: { type: String, trim: true, maxlength: 300, default: '' },
  duracion: { type: String, trim: true, default: '30 Minutos' },
  minutos: { type: Number, min: 1, max: 480, default: 30 },
  precio: { type: Number, min: 0, default: 0 },
  barbero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', default: null },
  activo: { type: Boolean, default: true },
}, { timestamps: true });

servicioSchema.index({ barbero: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Servicio', servicioSchema);

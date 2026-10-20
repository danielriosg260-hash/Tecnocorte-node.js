const mongoose = require('mongoose');

// Servicios propios que un barbero ofrece además del catálogo base.
const servicioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    descripcion: { type: String, default: '', maxlength: 300 },
    duracion: { type: String, default: '30 Minutos', maxlength: 50 },
    minutos: { type: Number, default: 30, min: 15, max: 480 },
    precio: { type: Number, default: 0, min: 0 },
    barbero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria' },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

servicioSchema.index({ barbero: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('Servicio', servicioSchema);

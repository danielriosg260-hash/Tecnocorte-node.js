const mongoose = require('mongoose');

const solicitudServicioSchema = new mongoose.Schema({
  barbero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  descripcion: { type: String, trim: true, maxlength: 300, default: '' },
  duracion: { type: String, trim: true, default: '30 Minutos' },
  minutos: { type: Number, min: 1, max: 480, default: 30 },
  precio: { type: Number, min: 0, default: 0 },
  estado: { type: String, enum: ['pendiente', 'aprobada', 'rechazada'], default: 'pendiente' },
  nota_admin: { type: String, trim: true, maxlength: 300, default: '' },
  resuelta: { type: Date, default: null },
}, { timestamps: true });

solicitudServicioSchema.index({ estado: 1, createdAt: -1 });

module.exports = mongoose.model('SolicitudServicio', solicitudServicioSchema);

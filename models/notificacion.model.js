const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  reserva: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' },
  tipo: { type: String, enum: ['reserva', 'cancelacion', 'modificacion', 'suspension', 'sistema'], default: 'sistema' },
  titulo: { type: String, required: true, trim: true, maxlength: 120 },
  mensaje: { type: String, required: true, trim: true, maxlength: 500 },
  leida: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificacionSchema.index({ usuario: 1, createdAt: -1 });
notificacionSchema.virtual('fecha').get(function () { return this.createdAt; });
notificacionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notificacion', notificacionSchema);

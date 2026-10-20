// Avisos internos que ven los usuarios (reservas, cancelaciones, sistema).
const mongoose = require('mongoose');

// Esquema de notificación dirigida a un usuario.
const notificacionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  // Reserva relacionada con la notificación, si corresponde.
  reserva: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva' },
  // Motivo de la notificación, usado para agrupar o filtrar.
  tipo: { type: String, enum: ['reserva', 'cancelacion', 'modificacion', 'suspension', 'sistema'], default: 'sistema' },
  titulo: { type: String, required: true, trim: true, maxlength: 120 },
  mensaje: { type: String, required: true, trim: true, maxlength: 500 },
  leida: { type: Boolean, default: false, index: true }
}, { timestamps: true });

// Listado ordenado por fecha descendente para el centro de avisos.
notificacionSchema.index({ usuario: 1, createdAt: -1 });
notificacionSchema.virtual('fecha').get(function () { return this.createdAt; });
notificacionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Notificacion', notificacionSchema);

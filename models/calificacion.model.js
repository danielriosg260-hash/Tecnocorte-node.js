const mongoose = require('mongoose');

// Calificación de una cita o reseña que deja un cliente desde la portada.
const calificacionSchema = new mongoose.Schema(
  {
    reserva: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva', default: null },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    puntuacion: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, maxlength: 1000, default: '' }
  },
  { timestamps: true }
);

// Una cita solo se puede calificar una vez, pero las reseñas de portada
// (sin reserva) no chocan entre sí.
calificacionSchema.index({ reserva: 1 }, { unique: true, sparse: true });

calificacionSchema.virtual('fecha').get(function () {
  return this.createdAt;
});

module.exports = mongoose.model('Calificacion', calificacionSchema);

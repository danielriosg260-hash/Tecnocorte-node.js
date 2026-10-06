const mongoose = require('mongoose');

const calificacionSchema = new mongoose.Schema({
  reserva: { type: mongoose.Schema.Types.ObjectId, ref: 'Reserva', required: true, unique: true },
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  puntuacion: { type: Number, required: true, min: 1, max: 5 },
  comentario: { type: String, maxlength: 1000, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Calificacion', calificacionSchema);

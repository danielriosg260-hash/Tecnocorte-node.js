// Días u horas en los que la peluquería no atiende (vacaciones, feriados, corte de luz).
const mongoose = require('mongoose');

// Esquema de bloqueo de agenda de una peluquería.
const bloqueoSchema = new mongoose.Schema({
  // Peluquería que aplica el bloqueo.
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  // Día completo que se bloquea.
  fecha: { type: Date, required: true },
  // Si tiene hora, solo se bloquea ese horario; null = toda la jornada.
  hora: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, default: null },
  motivo: { type: String, maxlength: 200, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Bloqueo', bloqueoSchema);

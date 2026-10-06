const mongoose = require('mongoose');

const bloqueoSchema = new mongoose.Schema({
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  fecha: { type: Date, required: true },
  hora: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, default: null },
  motivo: { type: String, maxlength: 200, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Bloqueo', bloqueoSchema);

const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  dia_semana: { type: Number, required: true, min: 0, max: 6 },
  activo: { type: Boolean, default: true },
  hora_inicio: { type: String, default: '09:00' },
  hora_fin: { type: String, default: '18:00' }
}, { timestamps: true });

horarioSchema.index({ peluqueria: 1, dia_semana: 1 }, { unique: true });

module.exports = mongoose.model('Horario', horarioSchema);

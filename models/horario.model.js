const mongoose = require('mongoose');

const horarioSchema = new mongoose.Schema({
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  dia_semana: { type: Number, required: true, min: 0, max: 6 },
  activo: { type: Boolean, default: true },
  hora_inicio: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, default: '09:00' },
  hora_fin: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, default: '18:00' }
}, { timestamps: true });

horarioSchema.pre('validate', function (next) {
  const toMinutes = (value) => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return -1;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  if (toMinutes(this.hora_inicio) >= toMinutes(this.hora_fin)) return next(new Error('El horario de inicio debe ser anterior al horario de cierre.'));
  next();
});

horarioSchema.index({ peluqueria: 1, dia_semana: 1 }, { unique: true });

module.exports = mongoose.model('Horario', horarioSchema);

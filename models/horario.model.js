// Horario semanal de atención de una peluquería: un documento por día de la semana.
const mongoose = require('mongoose');

// Esquema de horario de apertura/cierre por día.
const horarioSchema = new mongoose.Schema({
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  // Día de la semana: 0 = lunes ... 6 = domingo.
  dia_semana: { type: Number, required: true, min: 0, max: 6 },
  // Permite desactivar un día sin borrar su horario guardado.
  activo: { type: Boolean, default: true },
  // Horas en formato 24h "HH:MM" (validadas con expresión regular).
  hora_inicio: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, default: '09:00' },
  hora_fin: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/, default: '18:00' }
}, { timestamps: true });

// Valida antes de guardar que la hora de inicio sea anterior a la de cierre.
horarioSchema.pre('validate', function (next) {
  // Convierte "HH:MM" a minutos desde medianoche; -1 si el formato no es válido.
  const toMinutes = (value) => {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return -1;
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  if (toMinutes(this.hora_inicio) >= toMinutes(this.hora_fin)) return next(new Error('El horario de inicio debe ser anterior al horario de cierre.'));
  next();
});

// Un solo horario por peluquería y día de la semana.
horarioSchema.index({ peluqueria: 1, dia_semana: 1 }, { unique: true });

module.exports = mongoose.model('Horario', horarioSchema);

// Cita entre un cliente y un peluquero en una fecha y hora determinadas.
const mongoose = require('mongoose');

// Esquema de reserva (cita) del sistema.
const reservaSchema = new mongoose.Schema({
  // Terceros implicados: quien reserva, dónde y quién atiende.
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  // Día de la cita (solo fecha) y hora de inicio en formato "HH:MM".
  fecha: { type: Date, required: true },
  hora: { type: String, required: true, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
  // Nombre del servicio tomado del catálogo (se guarda como texto, no como referencia).
  servicio: { type: String, required: true, trim: true, maxlength: 120 },
  // Duración reservada en minutos; define cuántos huecos ocupa en la agenda.
  minutos: { type: Number, default: 30, min: 15, max: 480 },
  // Estados del flujo de la cita (ver TRANSICIONES_RESERVA en config/constantes.js).
  estado: { type: String, enum: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'Reprogramar'], default: 'Pendiente' },
  // Se marca cuando el peluquero pide mover la cita y el cliente debe aceptar.
  requiere_reprogramacion: { type: Boolean, default: false },
  motivo_reprogramacion: { type: String, default: '' }
}, { timestamps: true });

// Impide dos reservas activas exactamente en el mismo puesto y horario.
reservaSchema.index(
  { peluquero: 1, fecha: 1, hora: 1 },
  { unique: true, partialFilterExpression: { estado: { $in: ['Pendiente', 'Confirmada', 'Completada', 'Reprogramar'] } } }
);

const Reserva = mongoose.model('Reserva', reservaSchema);

module.exports = Reserva;

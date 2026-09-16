const mongoose = require('mongoose');

// Modelo de Reserva que define la estructura de las reservas que hacen los clientes
// en MongoDB, guardando quién reserva, en qué peluquería, el día y la hora, el
// servicio y el estado de la reserva.
// También registra automáticamente las fechas de creación y actualización.
const reservaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  peluquero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, required: true },
  hora: { type: String, required: true, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
  servicio: { type: String, required: true, trim: true, maxlength: 120 },
  minutos: { type: Number, default: 30, min: 15, max: 480 },
  estado: { type: String, enum: ['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'Reprogramar'], default: 'Pendiente' },
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

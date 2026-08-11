const mongoose = require('mongoose');

// Modelo de Reserva que define la estructura de las reservas que hacen los clientes
// en MongoDB, guardando quién reserva, en qué peluquería, el día y la hora, el
// servicio y el estado de la reserva.
// También registra automáticamente las fechas de creación y actualización.
const reservaSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  fecha: { type: Date, required: true },
  hora: { type: String, required: true },
  servicio: { type: String },
  estado: { type: String, default: 'Pendiente' }
}, { timestamps: true });

const Reserva = mongoose.model('Reserva', reservaSchema);

module.exports = Reserva;

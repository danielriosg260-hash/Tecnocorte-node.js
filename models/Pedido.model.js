const mongoose = require('mongoose');

// Modelo de Pedido que define la estructura de los pedidos realizados por los clientes
// en MongoDB, incluyendo la información del cliente, la fecha, el total y el estado.
// También registra automáticamente las fechas de creación y actualización.
const pedidoSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now },
  total: { type: Number, default: 0 },
  estado: { type: String, default: 'Pendiente' }
}, { timestamps: true });

const Pedido = mongoose.model('Pedido', pedidoSchema);

module.exports = Pedido;
const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now },
  total: { type: Number, default: 0, min: 0 },
  estado: { type: String, enum: ['Pendiente', 'Listo', 'Entregado', 'Cancelado'], default: 'Pendiente' },
  pago_confirmado: { type: Boolean, default: false },
  fecha_pago: { type: Date, default: null },
  fecha_entrega: { type: Date, default: null }
}, { timestamps: true });

const Pedido = mongoose.model('Pedido', pedidoSchema);

module.exports = Pedido;

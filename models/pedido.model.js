// Pedido de productos de la tienda hecho por un cliente.
const mongoose = require('mongoose');

// Cabecera del pedido; sus líneas viven en PedidoProducto.
const pedidoSchema = new mongoose.Schema({
  cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  fecha: { type: Date, default: Date.now },
  // Suma de las líneas del pedido, calculada por el controlador.
  total: { type: Number, default: 0, min: 0 },
  // Flujo de estados de entrega (ver TRANSICIONES_PEDIDO en config/constantes.js).
  estado: { type: String, enum: ['Pendiente', 'Listo', 'Entregado', 'Cancelado'], default: 'Pendiente' },
  // Confirmación de pago y fechas de pago/entrega (null mientras no ocurran).
  pago_confirmado: { type: Boolean, default: false },
  fecha_pago: { type: Date, default: null },
  fecha_entrega: { type: Date, default: null }
}, { timestamps: true });

const Pedido = mongoose.model('Pedido', pedidoSchema);

module.exports = Pedido;

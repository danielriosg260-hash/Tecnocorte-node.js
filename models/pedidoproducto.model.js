const mongoose = require('mongoose');

const pedidoProductoSchema = new mongoose.Schema({
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precio: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const PedidoProducto = mongoose.model('PedidoProducto', pedidoProductoSchema);

module.exports = PedidoProducto;

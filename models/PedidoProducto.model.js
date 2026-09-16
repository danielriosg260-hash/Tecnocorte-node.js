const mongoose = require('mongoose');

// Modelo de PedidoProducto que define la estructura de la relación entre un pedido y los
// productos asociados en MongoDB, almacenando la cantidad y el precio de cada producto.
// También registra automáticamente las fechas de creación y actualización.
const pedidoProductoSchema = new mongoose.Schema({
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precio: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const PedidoProducto = mongoose.model('PedidoProducto', pedidoProductoSchema);

module.exports = PedidoProducto;

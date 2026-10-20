// Línea de detalle de un pedido: qué producto, cuánto y a qué precio.
const mongoose = require('mongoose');

// Ítem individual dentro de un Pedido.
const pedidoProductoSchema = new mongoose.Schema({
  pedido: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
  cantidad: { type: Number, required: true, min: 1 },
  // Precio unitario congelado al momento de comprar (puede cambiar el catálogo).
  precio: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const PedidoProducto = mongoose.model('PedidoProducto', pedidoProductoSchema);

module.exports = PedidoProducto;

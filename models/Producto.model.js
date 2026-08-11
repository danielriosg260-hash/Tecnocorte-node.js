const mongoose = require('mongoose');

// Modelo de Producto que define la estructura de los datos de los productos,
// incluyendo su información principal, disponibilidad y stock.
// También registra automáticamente las fechas de creación y actualización.
const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  categoria: { type: String },
  stock: { type: Number, default: 0 },
  disponible: { type: Boolean, default: true }
}, { timestamps: true });

const Producto = mongoose.model('Producto', productoSchema, 'productos');

module.exports = Producto;
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 160 },
  descripcion: { type: String, maxlength: 2000 },
  precio: { type: Number, required: true, min: 0 },
  categoria: { type: String, maxlength: 80 },
  imagen: { type: String },
  stock: { type: Number, default: 0, min: 0 },
  disponible: { type: Boolean, default: true }
}, { timestamps: true });

const Producto = mongoose.model('Producto', productoSchema, 'productos');

module.exports = Producto;

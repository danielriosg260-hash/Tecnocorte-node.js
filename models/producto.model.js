// Producto del catálogo de la tienda (herramientas, cuidado capilar, etc.).
const mongoose = require('mongoose');

// Esquema de producto comercializable.
const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 160 },
  descripcion: { type: String, maxlength: 2000 },
  // Precio en pesos, sin decimales.
  precio: { type: Number, required: true, min: 0 },
  // Clave de categoría (Herramientas, Fijacion, Cuidado, Barba); ver CATEGORIAS.
  categoria: { type: String, maxlength: 80 },
  imagen: { type: String },
  // Unidades disponibles; el carrito lo valida contra este valor.
  stock: { type: Number, default: 0, min: 0 },
  // Permite ocultar un producto sin borrarlo del catálogo.
  disponible: { type: Boolean, default: true }
}, { timestamps: true });

// Colección con nombre propio "productos" en vez del plural por defecto.
const Producto = mongoose.model('Producto', productoSchema, 'productos');

module.exports = Producto;

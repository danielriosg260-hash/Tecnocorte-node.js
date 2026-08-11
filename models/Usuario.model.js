const mongoose = require('mongoose');

// Modelo de Usuario: establece la estructura de los datos que se almacenarán en la
// colección de usuarios, definiendo los campos, sus restricciones y generando
// automáticamente las fechas de creación y actualización de cada registro.
const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  telefono: { type: String },
  rol: { type: String, default: 'Cliente' }
}, { timestamps: true });

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
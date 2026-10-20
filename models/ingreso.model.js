// Historial de inicios de sesión: sirve para auditar accesos y ver la actividad.
const mongoose = require('mongoose');

// Registro de cada vez que un usuario entra al sitio.
const ingresoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  // Rol que tenía el usuario en el momento del ingreso (puede cambiar después).
  rol: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  ip: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Ingreso', ingresoSchema);

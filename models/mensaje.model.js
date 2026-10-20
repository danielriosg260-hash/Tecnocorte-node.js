// Mensajes enviados desde el formulario de contacto del sitio público.
const mongoose = require('mongoose');

// Esquema de mensaje de contacto.
const mensajeSchema = new mongoose.Schema({
  // Quien escribe el mensaje (no necesita tener cuenta).
  nombre: { type: String, required: true, maxlength: 120 },
  email: { type: String, required: true, maxlength: 254 },
  asunto: { type: String, required: true, maxlength: 200 },
  // Categoría del mensaje para filtrarlos en el panel de administración.
  tipo: {
    type: String,
    enum: ['consulta', 'soporte', 'cita', 'pedido', 'cuenta', 'denuncia', 'otro'],
    default: 'consulta'
  },
  mensaje: { type: String, required: true, maxlength: 5000 },
  // Marca si el administrador ya lo revisó.
  leido: { type: Boolean, default: false }
}, { timestamps: true });

mensajeSchema.virtual('fecha').get(function () { return this.createdAt; });
mensajeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Mensaje', mensajeSchema);

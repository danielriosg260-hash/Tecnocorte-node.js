const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
  nombre: { type: String, required: true, maxlength: 120 },
  email: { type: String, required: true, maxlength: 254 },
  asunto: { type: String, required: true, maxlength: 200 },
  mensaje: { type: String, required: true, maxlength: 5000 },
  leido: { type: Boolean, default: false }
}, { timestamps: true });

mensajeSchema.virtual('fecha').get(function () { return this.createdAt; });
mensajeSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Mensaje', mensajeSchema);

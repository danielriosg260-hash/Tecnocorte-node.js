const mongoose = require('mongoose');

// Historial de acciones importantes hechas por los administradores y barberos.
const registroAccionSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    accion: { type: String, required: true, maxlength: 80 },
    entidad: { type: String, default: '', maxlength: 80 },
    entidad_id: { type: String, default: '' },
    detalle: { type: String, default: '', maxlength: 500 },
    ip: { type: String, default: '', maxlength: 45 },
    navegador: { type: String, default: '', maxlength: 200 }
  },
  { timestamps: true }
);

registroAccionSchema.virtual('fecha').get(function () {
  return this.createdAt;
});

module.exports = mongoose.model('RegistroAccion', registroAccionSchema);

const mongoose = require('mongoose');

// Historial de acciones importantes hechas por los administradores y barberos.
const registroAccionSchema = new mongoose.Schema(
  {
    // Usuario que ejecutó la acción; null si es del sistema.
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    // Nombre corto de la acción (ej: "crear_servicio", "aprobar_solicitud").
    accion: { type: String, required: true, maxlength: 80 },
    // Tipo de documento afectado y su id guardado como texto (cubre colecciones variadas).
    entidad: { type: String, default: '', maxlength: 80 },
    entidad_id: { type: String, default: '' },
    detalle: { type: String, default: '', maxlength: 500 },
    // Contexto del pedido HTTP para auditoría.
    ip: { type: String, default: '', maxlength: 45 },
    navegador: { type: String, default: '', maxlength: 200 }
  },
  { timestamps: true }
);

registroAccionSchema.virtual('fecha').get(function () {
  return this.createdAt;
});

module.exports = mongoose.model('RegistroAccion', registroAccionSchema);

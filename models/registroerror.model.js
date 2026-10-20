const mongoose = require('mongoose');

// Errores que ocurren en el sitio para que el administrador los revise.
const registroErrorSchema = new mongoose.Schema(
  {
    // Código interno del error para agruparlos (ej: "ERESERVA").
    codigo: { type: String, required: true, maxlength: 40 },
    // Ciclo de vida del reporte en el panel de administración.
    estado: { type: String, enum: ['pendiente', 'revisado', 'ignorado'], default: 'pendiente' },
    // Respuesta HTTP asociada y datos de la petición que falló.
    codigo_http: { type: Number, default: 500 },
    ruta: { type: String, maxlength: 300 },
    metodo: { type: String, maxlength: 10 },
    tipo: { type: String, maxlength: 150 },
    mensaje: { type: String, maxlength: 1000 },
    // Traza técnica completa (stack); puede ser larga.
    detalle: { type: String, default: '' },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    ip: { type: String, default: '', maxlength: 45 },
    navegador: { type: String, default: '', maxlength: 200 },
    // Indica si ya se envió el correo/alerta al administrador.
    notificado: { type: Boolean, default: false }
  },
  { timestamps: true }
);

registroErrorSchema.virtual('fecha').get(function () {
  return this.createdAt;
});

module.exports = mongoose.model('RegistroError', registroErrorSchema);

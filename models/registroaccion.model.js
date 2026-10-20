const mongoose = require('mongoose');

const registroAccionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  accion: { type: String, required: true, maxlength: 80 },
  modelo: { type: String, default: '', maxlength: 80 },
  objeto_id: { type: String, default: '', maxlength: 80 },
  detalle: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: '', maxlength: 45 },
  navegador: { type: String, default: '', maxlength: 300 },
}, { timestamps: true });

registroAccionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('RegistroAccion', registroAccionSchema);

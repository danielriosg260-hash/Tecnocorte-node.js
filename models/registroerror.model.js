const mongoose = require('mongoose');

const registroErrorSchema = new mongoose.Schema({
  codigo: { type: String, required: true, maxlength: 20 },
  codigo_http: { type: Number, required: true },
  tipo: { type: String, default: '', maxlength: 100 },
  titulo: { type: String, default: '', maxlength: 200 },
  mensaje: { type: String, default: '' },
  detalle: { type: String, default: '' },
  ruta: { type: String, default: '', maxlength: 500 },
  metodo: { type: String, default: '', maxlength: 10 },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  ip: { type: String, default: '', maxlength: 45 },
  navegador: { type: String, default: '', maxlength: 300 },
  revisado: { type: Boolean, default: false },
}, { timestamps: true });

registroErrorSchema.index({ codigo_http: 1, createdAt: -1 });

module.exports = mongoose.model('RegistroError', registroErrorSchema);

const mongoose = require('mongoose');

const imagenPeluqueriaSchema = new mongoose.Schema({
  peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
  url: { type: String, required: true, trim: true },
  public_id: { type: String, default: '' },
  descripcion: { type: String, trim: true, maxlength: 200, default: '' },
}, { timestamps: true });

imagenPeluqueriaSchema.index({ peluqueria: 1, createdAt: -1 });

module.exports = mongoose.model('ImagenPeluqueria', imagenPeluqueriaSchema);

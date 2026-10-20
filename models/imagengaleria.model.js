const mongoose = require('mongoose');

// Fotos de la galería de cada peluquería.
const imagenPeluqueriaSchema = new mongoose.Schema(
  {
    peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    descripcion: { type: String, default: '', maxlength: 200 }
  },
  { timestamps: true }
);

imagenPeluqueriaSchema.virtual('fecha').get(function () {
  return this.createdAt;
});

module.exports = mongoose.model('ImagenPeluqueria', imagenPeluqueriaSchema);

const mongoose = require('mongoose');

// Fotos de la galería de cada peluquería.
const imagenPeluqueriaSchema = new mongoose.Schema(
  {
    peluqueria: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria', required: true },
    // URL de la imagen en Cloudinary y su public_id para poder eliminarla.
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

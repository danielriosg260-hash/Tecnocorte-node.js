// Ficha de la peluquería: datos públicos del local y su propietario.
const mongoose = require('mongoose');

// Esquema de peluquería (local) del sistema.
const peluqueriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  // Dirección o referencia de ubicación mostrada en la portada.
  ubicacion: { type: String, required: true, trim: true, maxlength: 200 },
  telefono: { type: String, default: '', maxlength: 20 },
  descripcion: { type: String, default: '', maxlength: 2000 },
  // Imagen de portada (URL en Cloudinary).
  imagen: { type: String, default: '' },
  // Usuario con rol Admin dueño de la peluquería.
  dueno: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null }
}, { timestamps: true });

const Peluqueria = mongoose.model('Peluqueria', peluqueriaSchema);

module.exports = Peluqueria;
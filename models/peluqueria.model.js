const mongoose = require('mongoose');

const peluqueriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  ubicacion: { type: String, required: true, trim: true, maxlength: 200 },
  telefono: { type: String, default: '', maxlength: 20 },
  descripcion: { type: String, default: '', maxlength: 2000 },
  imagen: { type: String, default: '' },
  dueno: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null }
}, { timestamps: true });

const Peluqueria = mongoose.model('Peluqueria', peluqueriaSchema);

module.exports = Peluqueria;
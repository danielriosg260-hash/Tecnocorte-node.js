const mongoose = require('mongoose');

const configuracionSchema = new mongoose.Schema({
  sitio_nombre: { type: String, default: 'TecnoCorte', maxlength: 100 },
  correo_contacto: { type: String, default: 'tecnocorte083@gmail.com', maxlength: 254 },
  texto_aviso: { type: String, default: '', maxlength: 200 },
  registro_abierto: { type: Boolean, default: true },
  mostrar_telefonos: { type: Boolean, default: true },
  mostrar_ubicaciones: { type: Boolean, default: true },
  mostrar_galeria: { type: Boolean, default: true },
  mostrar_calificaciones: { type: Boolean, default: true },
  modo_mantenimiento: { type: Boolean, default: false },
  mensaje_mantenimiento: { type: String, default: 'Estamos realizando mejoras. Volvemos pronto.', maxlength: 200 },
  servicio_destacado_1: { type: String, default: '', maxlength: 100 },
  servicio_destacado_2: { type: String, default: '', maxlength: 100 },
  producto_destacado_1: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null },
  producto_destacado_2: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null },
}, { timestamps: true });

configuracionSchema.statics.cargar = function () {
  return this.findOneAndUpdate({}, { $setOnInsert: {} }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

module.exports = mongoose.model('Configuracion', configuracionSchema);

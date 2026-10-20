const mongoose = require('mongoose');

// Configuración general del sitio. Solo debe existir un documento.
const configuracionSchema = new mongoose.Schema(
  {
    sitio_nombre: { type: String, default: 'TecnoCorte', maxlength: 100 },
    correo_contacto: { type: String, default: 'tecnocorte083@gmail.com', maxlength: 254 },
    texto_aviso: { type: String, default: '', maxlength: 300 },
    registro_abierto: { type: Boolean, default: true },
    mostrar_telefonos: { type: Boolean, default: true },
    mostrar_ubicaciones: { type: Boolean, default: true },
    mostrar_galeria: { type: Boolean, default: true },
    mostrar_calificaciones: { type: Boolean, default: true },
    modo_mantenimiento: { type: Boolean, default: false },
    mensaje_mantenimiento: { type: String, default: '', maxlength: 300 },
    servicio_destacado_1: { type: String, default: '' },
    servicio_destacado_2: { type: String, default: '' },
    producto_destacado_1: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null },
    producto_destacado_2: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', default: null }
  },
  { timestamps: true }
);

/** Devuelve la configuración y la crea si todavía no existe. */
configuracionSchema.statics.cargar = async function () {
  const config = await this.findOne();
  return config || (await this.create({}));
};

module.exports = mongoose.model('Configuracion', configuracionSchema);

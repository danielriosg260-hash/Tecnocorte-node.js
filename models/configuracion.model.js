const mongoose = require('mongoose');

// Configuración general del sitio. Solo debe existir un documento.
// Los toggles "mostrar_*" controlan qué bloques ven los visitantes públicos.
const configuracionSchema = new mongoose.Schema(
  {
    // Textos visibles en la portada y páginas públicas.
    sitio_nombre: { type: String, default: 'TecnoCorte', maxlength: 100 },
    correo_contacto: { type: String, default: 'tecnocorte083@gmail.com', maxlength: 254 },
    texto_aviso: { type: String, default: '', maxlength: 300 },
    // Si es false el registro de usuarios queda cerrado.
    registro_abierto: { type: Boolean, default: true },
    // Visibilidad de secciones del sitio público.
    mostrar_telefonos: { type: Boolean, default: true },
    mostrar_ubicaciones: { type: Boolean, default: true },
    mostrar_galeria: { type: Boolean, default: true },
    mostrar_calificaciones: { type: Boolean, default: true },
    // Modo mantenimiento: bloquea el acceso y muestra el mensaje propio.
    modo_mantenimiento: { type: Boolean, default: false },
    mensaje_mantenimiento: { type: String, default: '', maxlength: 300 },
    // Títulos de los servicios destacados escritos a mano en la portada.
    servicio_destacado_1: { type: String, default: '' },
    servicio_destacado_2: { type: String, default: '' },
    // Productos de la tienda destacados (referencias al catálogo).
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

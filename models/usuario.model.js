// Modelo de usuarios del sistema: clientes, barberos y administradores.
// Guarda credenciales (contraseña hasheada con bcrypt), preferencias de
// aviso, verificación de correo y el portafolio de fotos de los barberos.
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Esquema principal de la cuenta de usuario.
const usuarioSchema = new mongoose.Schema({
  // Datos personales básicos.
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  apellido: { type: String, required: true, trim: true, maxlength: 80 },
  // Correo único e irá en minúsculas; sirve también como usuario de acceso.
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  // Contraseña en texto plano solo hasta el pre-save; nunca se consulta (select: false).
  password: { type: String, required: true, minlength: 8, maxlength: 128, select: false },
  telefono: { type: String },
  // Rol del usuario dentro de la peluquería; define los permisos en middleware/roles.
  rol: { type: String, enum: ['Cliente', 'Barbero', 'Admin'], default: 'Cliente' },
  // Baja lógica: en vez de borrar el documento se desactiva la cuenta.
  activo: { type: Boolean, default: true },
  // Peluquería a la que pertenece el barbero o de la que es dueño (null en clientes sueltos).
  peluqueria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria' },

  // Preferencias de notificación: canales activos y con cuánta anticipación se avisa.
  aviso_correo: { type: Boolean, default: true },
  aviso_whatsapp: { type: Boolean, default: false },
  aviso_sms: { type: Boolean, default: false },
  aviso_anticipacion_horas: { type: Number, default: 2, min: 1, max: 72 },
  // Si es false el perfil del barbero no se muestra públicamente.
  privacidad_perfil: { type: Boolean, default: false },

  // Foto de perfil subida a Cloudinary (public_id necesario para eliminarla).
  foto: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  },
  // Galería de trabajos del barbero; cada entrada también vive en Cloudinary.
  portafolio: [{
    url: { type: String, required: true },
    public_id: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],

  // Restablecimiento de contraseña: token de un solo uso con vencimiento.
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  // Al subirlo se invalidan los JWT emitidos antes (tokens con versión vieja).
  tokenVersion: { type: Number, default: 0, min: 0, select: false },

  // Verificación de correo: por defecto true para no bloquear cuentas existentes.
  email_verificado: { type: Boolean, default: true },
  email_verificacion_token: { type: String, select: false },
  email_verificacion_expira: { type: Date, select: false }
}, { timestamps: true });

// Virtuales para que las vistas puedan leer fechas ya formateadas en español.
usuarioSchema.virtual('fecha_creacion').get(function () { return this.createdAt; });
usuarioSchema.virtual('fecha_actualizacion').get(function () { return this.updatedAt; });
usuarioSchema.set('toJSON', { virtuals: true });

// Antes de guardar: hashea la contraseña solo si cambió y rota tokenVersion
// para cerrar sesiones abiertas con tokens antiguos.
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (!this.isNew) this.tokenVersion = (this.tokenVersion || 0) + 1;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compara la contraseña enviada por el usuario con el hash guardado.
usuarioSchema.methods.compararPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;

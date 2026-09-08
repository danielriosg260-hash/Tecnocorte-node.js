const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  apellido: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, minlength: 8, maxlength: 128, select: false },
  telefono: { type: String },
  rol: { type: String, enum: ['Cliente', 'Barbero', 'Admin'], default: 'Cliente' },
  activo: { type: Boolean, default: true },
  peluqueria_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Peluqueria' },
  foto: {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' }
  },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false }
}, { timestamps: true });

usuarioSchema.virtual('fecha_creacion').get(function () { return this.createdAt; });
usuarioSchema.virtual('fecha_actualizacion').get(function () { return this.updatedAt; });
usuarioSchema.set('toJSON', { virtuals: true });

// Antes de guardar, hashea la password si fue modificada
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar passwords en el login
usuarioSchema.methods.compararPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;

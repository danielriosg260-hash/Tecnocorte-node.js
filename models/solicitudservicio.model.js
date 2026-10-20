const mongoose = require('mongoose');

// Solicitudes que hacen los barberos para que el admin les cree un servicio.
const solicitudServicioSchema = new mongoose.Schema(
  {
    barbero: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nombre: { type: String, required: true, trim: true, maxlength: 100 },
    descripcion: { type: String, default: '', maxlength: 300 },
    duracion: { type: String, default: '30 Minutos', maxlength: 50 },
    minutos: { type: Number, default: 30, min: 15, max: 480 },
    precio: { type: Number, default: 0, min: 0 },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'rechazada'],
      default: 'pendiente'
    },
    nota_admin: { type: String, default: '', maxlength: 300 },
    resuelta: { type: Date, default: null }
  },
  { timestamps: true }
);

solicitudServicioSchema.virtual('creada').get(function () {
  return this.createdAt;
});

module.exports = mongoose.model('SolicitudServicio', solicitudServicioSchema);

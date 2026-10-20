const RegistroAccion = require('../models/registroaccion.model');

function registrarAccion(req, accion, modelo = '', objetoId = '', detalle = {}) {
  return RegistroAccion.create({
    usuario: req.usuario?._id || null,
    accion,
    modelo,
    objeto_id: objetoId ? String(objetoId) : '',
    detalle,
    ip: req.ip || '',
    navegador: req.get('user-agent') || '',
  });
}

function auditarSolicitud(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 500) {
        void registrarAccion(req, `${req.method} ${req.path}`, '', '', { status: res.statusCode })
          .catch((error) => console.error(`No se pudo guardar auditoría: ${error.message}`));
      }
    });
  }
  next();
}

module.exports = { registrarAccion, auditarSolicitud };

const RegistroAccion = require('../models/registroaccion.model');
const RegistroError = require('../models/registroerror.model');

async function acciones(req, res) {
  return res.render('administrador/admin_acciones', {
    layout: 'layouts/dashboard',
    acciones: await RegistroAccion.find().populate('usuario', 'nombre apellido email rol').sort({ createdAt: -1 }).limit(200),
  });
}

async function errores(req, res) {
  return res.render('administrador/admin_errores', {
    layout: 'layouts/dashboard',
    errores: await RegistroError.find().populate('usuario', 'nombre apellido email').sort({ createdAt: -1 }).limit(200),
  });
}

async function revisarError(req, res) {
  await RegistroError.findByIdAndUpdate(req.params.id, { revisado: true });
  return res.redirect('/admin/errores');
}

module.exports = { acciones, errores, revisarError };

const Servicio = require('../models/servicio.model');
const SolicitudServicio = require('../models/solicitudservicio.model');
const { registrarAccion } = require('../services/auditoria');

async function servicios(req, res) {
  return res.render('peluqueros/peluquero_servicios', {
    layout: 'layouts/dashboard',
    servicios: await Servicio.find({ barbero: req.usuario._id }).sort({ nombre: 1 }),
    solicitudes: await SolicitudServicio.find({ barbero: req.usuario._id }).sort({ createdAt: -1 }),
  });
}

async function solicitar(req, res) {
  await SolicitudServicio.create({
    barbero: req.usuario._id,
    nombre: req.body.nombre,
    descripcion: req.body.descripcion || '',
    duracion: req.body.duracion || '30 Minutos',
    minutos: Number(req.body.minutos) || 30,
    precio: Number(req.body.precio) || 0,
  });
  await registrarAccion(req, 'solicitar_servicio_web', 'SolicitudServicio');
  return res.redirect('/barbero/servicios');
}

module.exports = { servicios, solicitar };

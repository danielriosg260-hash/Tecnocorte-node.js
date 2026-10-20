const Servicio = require('../models/servicio.model');
const fs = require('fs');
const path = require('path');
const SolicitudServicio = require('../models/solicitudservicio.model');
const Configuracion = require('../models/configuracion.model');
const ImagenPeluqueria = require('../models/imagenpeluqueria.model');
const Peluqueria = require('../models/peluqueria.model');
const { registrarAccion } = require('../services/auditoria');

async function servicios(req, res) {
  return res.render('administrador/admin_servicios', {
    layout: 'layouts/dashboard',
    servicios: await Servicio.find().populate('barbero peluqueria').sort({ nombre: 1 }),
    solicitudes: await SolicitudServicio.find().populate('barbero').sort({ createdAt: -1 }),
  });
}

async function crearServicio(req, res) {
  await Servicio.create({
    nombre: req.body.nombre,
    descripcion: req.body.descripcion || '',
    duracion: req.body.duracion || '30 Minutos',
    minutos: Number(req.body.minutos) || 30,
    precio: Number(req.body.precio) || 0,
    barbero: req.body.barbero,
    peluqueria: req.body.peluqueria || null,
  });
  await registrarAccion(req, 'crear_servicio_web', 'Servicio');
  return res.redirect('/admin/servicios');
}

async function resolverSolicitud(req, res) {
  const solicitud = await SolicitudServicio.findById(req.params.id);
  if (!solicitud) return res.status(404).send('Solicitud no encontrada');
  solicitud.estado = req.body.estado === 'aprobada' ? 'aprobada' : 'rechazada';
  solicitud.nota_admin = req.body.nota_admin || '';
  solicitud.resuelta = new Date();
  await solicitud.save();
  if (solicitud.estado === 'aprobada') {
    await Servicio.findOneAndUpdate(
      { barbero: solicitud.barbero, nombre: solicitud.nombre },
      { nombre: solicitud.nombre, descripcion: solicitud.descripcion, duracion: solicitud.duracion, minutos: solicitud.minutos, precio: solicitud.precio, barbero: solicitud.barbero },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  await registrarAccion(req, `resolver_solicitud_${solicitud.estado}`, 'SolicitudServicio', solicitud._id);
  return res.redirect('/admin/servicios');
}

async function configuracion(req, res) {
  if (req.method === 'POST') {
    const permitidos = ['sitio_nombre', 'correo_contacto', 'texto_aviso', 'mensaje_mantenimiento', 'servicio_destacado_1', 'servicio_destacado_2'];
    const cambios = Object.fromEntries(permitidos.map((campo) => [campo, req.body[campo] || '']));
    for (const campo of ['registro_abierto', 'mostrar_telefonos', 'mostrar_ubicaciones', 'mostrar_galeria', 'mostrar_calificaciones', 'modo_mantenimiento']) cambios[campo] = req.body[campo] === 'on';
    await Configuracion.findOneAndUpdate({}, cambios, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
    await registrarAccion(req, 'actualizar_configuracion_web', 'Configuracion');
    return res.redirect('/admin/configuracion');
  }
  return res.render('administrador/admin_configuracion', { layout: 'layouts/dashboard', configuracion: await Configuracion.cargar() });
}

async function galeria(req, res) {
  return res.render('administrador/admin_galeria', {
    layout: 'layouts/dashboard',
    imagenes: await ImagenPeluqueria.find().populate('peluqueria').sort({ createdAt: -1 }),
    peluquerias: await Peluqueria.find().sort({ nombre: 1 }),
  });
}

async function agregarImagen(req, res) {
  const url = req.file ? `/uploads/${req.file.filename}` : req.body.url;
  if (!url) return res.status(400).send('Debes subir una imagen o indicar una URL.');
  await ImagenPeluqueria.create({ peluqueria: req.body.peluqueria, url, public_id: req.file?.filename || req.body.public_id || '', descripcion: req.body.descripcion || '' });
  await registrarAccion(req, 'agregar_galeria_web', 'ImagenPeluqueria');
  return res.redirect('/admin/galeria');
}

async function eliminarImagen(req, res) {
  const imagen = await ImagenPeluqueria.findByIdAndDelete(req.params.id);
  if (imagen?.url?.startsWith('/uploads/')) await fs.promises.unlink(path.join(__dirname, '..', 'public', imagen.url.slice('/uploads/'.length))).catch(() => {});
  await registrarAccion(req, 'eliminar_galeria_web', 'ImagenPeluqueria', req.params.id);
  return res.redirect('/admin/galeria');
}

module.exports = { servicios, crearServicio, resolverSolicitud, configuracion, galeria, agregarImagen, eliminarImagen };

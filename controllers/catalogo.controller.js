const Servicio = require('../models/servicio.model');
const SolicitudServicio = require('../models/solicitudservicio.model');
const ImagenPeluqueria = require('../models/imagenpeluqueria.model');
const Peluqueria = require('../models/peluqueria.model');
const { registrarAccion } = require('../services/auditoria');

const camposServicio = (body) => ({
  nombre: body.nombre,
  descripcion: body.descripcion || '',
  duracion: body.duracion || '30 Minutos',
  minutos: Number(body.minutos) || 30,
  precio: Number(body.precio) || 0,
  barbero: body.barbero,
  peluqueria: body.peluqueria || null,
  activo: body.activo !== false,
});

async function listarServicios(req, res) {
  try {
    const filtro = req.usuario?.rol === 'Admin' ? {} : { activo: true };
    const servicios = await Servicio.find(filtro).populate('barbero peluqueria').sort({ nombre: 1 });
    return res.json(servicios);
  } catch (error) {
    return res.status(500).json({ mensaje: 'No se pudieron cargar los servicios' });
  }
}

async function crearServicio(req, res) {
  try {
    const servicio = await Servicio.create(camposServicio({ ...req.body, barbero: req.body.barbero || req.usuario._id }));
    await registrarAccion(req, 'crear_servicio', 'Servicio', servicio._id);
    return res.status(201).json(servicio);
  } catch (error) {
    return res.status(400).json({ mensaje: 'Datos de servicio inválidos' });
  }
}

async function actualizarServicio(req, res) {
  try {
    const servicio = await Servicio.findByIdAndUpdate(req.params.id, camposServicio({ ...req.body, barbero: req.body.barbero || req.usuario._id }), { new: true, runValidators: true });
    if (!servicio) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
    await registrarAccion(req, 'actualizar_servicio', 'Servicio', servicio._id);
    return res.json(servicio);
  } catch (error) {
    return res.status(400).json({ mensaje: 'Datos de servicio inválidos' });
  }
}

async function solicitarServicio(req, res) {
  try {
    const solicitud = await SolicitudServicio.create({ ...camposServicio({ ...req.body, barbero: req.usuario._id }), barbero: req.usuario._id });
    await registrarAccion(req, 'solicitar_servicio', 'SolicitudServicio', solicitud._id);
    return res.status(201).json(solicitud);
  } catch (error) {
    return res.status(400).json({ mensaje: 'Datos de solicitud inválidos' });
  }
}

async function listarSolicitudes(req, res) {
  const filtro = req.usuario.rol === 'Admin' ? {} : { barbero: req.usuario._id };
  const solicitudes = await SolicitudServicio.find(filtro).populate('barbero').sort({ createdAt: -1 });
  return res.json(solicitudes);
}

async function resolverSolicitud(req, res) {
  const { estado, nota_admin = '' } = req.body;
  if (!['aprobada', 'rechazada'].includes(estado)) return res.status(400).json({ mensaje: 'Estado inválido' });
  const solicitud = await SolicitudServicio.findById(req.params.id);
  if (!solicitud) return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
  solicitud.estado = estado;
  solicitud.nota_admin = nota_admin;
  solicitud.resuelta = new Date();
  await solicitud.save();
  if (estado === 'aprobada') {
    await Servicio.findOneAndUpdate(
      { barbero: solicitud.barbero, nombre: solicitud.nombre },
      { ...solicitud.toObject(), _id: undefined, estado: undefined, resuelta: undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  await registrarAccion(req, `solicitud_servicio_${estado}`, 'SolicitudServicio', solicitud._id);
  return res.json(solicitud);
}

async function listarGaleria(req, res) {
  const peluqueria = await Peluqueria.findById(req.params.peluqueriaId);
  if (!peluqueria) return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
  return res.json(await ImagenPeluqueria.find({ peluqueria: peluqueria._id }).sort({ createdAt: -1 }));
}

async function agregarGaleria(req, res) {
  const imagen = await ImagenPeluqueria.create({ peluqueria: req.body.peluqueria, url: req.body.url, public_id: req.body.public_id || '', descripcion: req.body.descripcion || '' });
  await registrarAccion(req, 'agregar_imagen_galeria', 'ImagenPeluqueria', imagen._id);
  return res.status(201).json(imagen);
}

async function eliminarGaleria(req, res) {
  const imagen = await ImagenPeluqueria.findByIdAndDelete(req.params.id);
  if (!imagen) return res.status(404).json({ mensaje: 'Imagen no encontrada' });
  await registrarAccion(req, 'eliminar_imagen_galeria', 'ImagenPeluqueria', req.params.id);
  return res.json({ mensaje: 'Imagen eliminada' });
}

module.exports = { listarServicios, crearServicio, actualizarServicio, solicitarServicio, listarSolicitudes, resolverSolicitud, listarGaleria, agregarGaleria, eliminarGaleria };

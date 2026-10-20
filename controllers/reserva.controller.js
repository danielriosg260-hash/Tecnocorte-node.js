const mongoose = require('mongoose');
const Reserva = require('../models/reserva.model');
const Usuario = require('../models/usuario.model');
const Peluqueria = require('../models/peluqueria.model');
const { ESTADOS_RESERVA } = require('../config/constantes');
const { notificarReserva } = require('../services/notificaciones');
const { reservasSolapadas } = require('../services/disponibilidad');
const { esFecha, fechaLocal, minutosDeHora } = require('../utils/fechas');

const ESTADOS_ACTIVOS = ['Pendiente', 'Confirmada', 'Completada', 'Reprogramar'];

/** Revisa que una cita tenga datos correctos y no se cruce con otra. */
async function validarReserva(datos) {
  const { cliente, peluqueria, peluquero, fecha, hora, servicio, minutos, estado, excluir } = datos;

  if (!mongoose.isValidObjectId(cliente) || !mongoose.isValidObjectId(peluqueria) || !mongoose.isValidObjectId(peluquero)) {
    return 'Los identificadores de la reserva no son válidos.';
  }

  if (minutosDeHora(hora) < 0 || !Number.isInteger(Number(minutos)) || !esFecha(fecha)) {
    return 'La fecha, la hora o la duración no son válidas.';
  }

  if (!String(servicio || '').trim() || String(servicio).length > 120) return 'El servicio no es válido.';
  if (fechaLocal(fecha, hora) <= new Date()) return 'La fecha y hora deben estar en el futuro.';
  if (estado !== undefined && !ESTADOS_RESERVA.some(([valor]) => valor === estado)) {
    return 'El estado de la reserva no es válido.';
  }

  const [existeCliente, existePeluqueria, existeBarbero] = await Promise.all([
    Usuario.exists({ _id: cliente, rol: 'Cliente', activo: { $ne: false } }),
    Peluqueria.exists({ _id: peluqueria }),
    Usuario.exists({ _id: peluquero, rol: 'Barbero', activo: { $ne: false }, peluqueria_id: peluqueria })
  ]);

  if (!existeCliente) return 'El cliente no existe o no está disponible.';
  if (!existePeluqueria) return 'La barbería no existe.';
  if (!existeBarbero) return 'El barbero no está disponible para esta barbería.';

  const ocupado = await reservasSolapadas(Reserva, {
    peluquero,
    fecha,
    hora,
    minutos: Number(minutos),
    excluir
  });

  return ocupado ? 'Ese horario ya está ocupado.' : null;
}

/** Limita lo que cada rol puede ver. */
function filtroPropietario(usuario) {
  if (usuario.rol === 'Admin') return {};
  if (usuario.rol === 'Barbero') return { peluquero: usuario._id };
  return { cliente: usuario._id };
}

/** Lista las reservas visibles para el usuario. */
async function find(req, res) {
  try {
    const reservas = await Reserva.find(filtroPropietario(req.usuario))
      .populate('cliente', 'nombre apellido email telefono')
      .populate('peluqueria', 'nombre ubicacion telefono')
      .populate('peluquero', 'nombre apellido email telefono');

    res.status(200).json(reservas);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar las reservas.' });
  }
}

/** Busca una reserva por su id. */
async function findOne(req, res) {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) })
      .populate('cliente', 'nombre apellido email telefono')
      .populate('peluqueria', 'nombre ubicacion telefono')
      .populate('peluquero', 'nombre apellido email telefono');

    if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });

    res.status(200).json(reserva);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar la reserva.' });
  }
}

/** Crea una reserva. */
async function insertOne(req, res) {
  try {
    const cliente = req.usuario.rol === 'Cliente' ? req.usuario._id : req.body.cliente;
    const peluquero = req.usuario.rol === 'Barbero' ? req.usuario._id : req.body.peluquero;
    const minutos = Number(req.body.minutos) || 30;
    const estado = req.usuario.rol === 'Admin' ? req.body.estado || 'Pendiente' : 'Pendiente';

    const error = await validarReserva({
      cliente,
      peluqueria: req.body.peluqueria,
      peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos,
      estado
    });

    if (error) return res.status(400).json({ mensaje: error });

    const reserva = await Reserva.create({
      cliente,
      peluqueria: req.body.peluqueria,
      peluquero,
      fecha: new Date(`${req.body.fecha}T00:00:00`),
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos,
      estado
    });

    void notificarReserva(reserva._id, 'reservada');
    res.status(201).json(reserva);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo crear la reserva.' });
  }
}

/** Actualiza una reserva. */
async function findOneAndUpdate(req, res) {
  try {
    const actual = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) });
    if (!actual) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });

    const esAdmin = req.usuario.rol === 'Admin';
    const permitidos = esAdmin
      ? ['peluqueria', 'peluquero', 'fecha', 'hora', 'servicio', 'minutos', 'estado']
      : ['peluqueria', 'fecha', 'hora', 'servicio', 'minutos'];

    const cambios = {};
    permitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    });

    const datos = {
      cliente: actual.cliente,
      peluqueria: cambios.peluqueria || actual.peluqueria,
      peluquero: esAdmin ? cambios.peluquero || actual.peluquero : actual.peluquero,
      fecha: cambios.fecha || actual.fecha,
      hora: cambios.hora || actual.hora,
      servicio: cambios.servicio || actual.servicio,
      minutos: cambios.minutos ? Number(cambios.minutos) : actual.minutos,
      estado: esAdmin ? cambios.estado || actual.estado : actual.estado
    };

    const error = await validarReserva({ ...datos, excluir: actual._id });
    if (error) return res.status(400).json({ mensaje: error });

    if (cambios.fecha) cambios.fecha = new Date(`${cambios.fecha}T00:00:00`);

    const reserva = await Reserva.findByIdAndUpdate(actual._id, cambios, { new: true, runValidators: true });
    void notificarReserva(reserva._id, 'modificada');

    res.status(200).json(reserva);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de la reserva inválidos.' });
  }
}

/** Elimina una reserva. */
async function findOneAndDelete(req, res) {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) });
    if (!reserva) return res.status(404).json({ mensaje: 'Reserva no encontrada.' });

    if (req.usuario.rol !== 'Admin' && ['Completada', 'Cancelada'].includes(reserva.estado)) {
      return res.status(409).json({ mensaje: 'Esta reserva ya no se puede eliminar.' });
    }

    await reserva.deleteOne();
    res.status(200).json({ mensaje: 'Reserva eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar la reserva.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

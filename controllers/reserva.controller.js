/**
 * API de reservas (citas): validación de datos y disponibilidad, más el
 * CRUD aplicando los permisos de cada rol (Admin, Barbero y Cliente).
 */
const mongoose = require('mongoose');
const Reserva = require('../models/reserva.model');
const Usuario = require('../models/usuario.model');
const Peluqueria = require('../models/peluqueria.model');
const Horario = require('../models/horario.model');
const Bloqueo = require('../models/bloqueo.model');
const { ESTADOS_RESERVA, TRANSICIONES_RESERVA } = require('../config/constantes');
const { notificarReserva } = require('../servicios/notificaciones');
const { dosHorasAntes, validarCita } = require('../servicios/disponibilidad');
const { claveFecha, esFecha, fechaLocal, minutosDeHora } = require('../utils/fechas');

// Estados de una cita viva. Queda declarada aquí, pero el archivo no la usa.
const ESTADOS_ACTIVOS = ['Pendiente', 'Confirmada', 'Reprogramar'];

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
  // Regla básica: no se reservan citas en el pasado.
  if (fechaLocal(fecha, hora) <= new Date()) return 'La fecha y hora deben estar en el futuro.';
  if (estado !== undefined && !ESTADOS_RESERVA.some(([valor]) => valor === estado)) {
    return 'El estado de la reserva no es válido.';
  }

  // El cliente, la barbería y el barbero deben existir y el barbero
  // tiene que pertenecer a la barbería elegida.
  const [existeCliente, existePeluqueria, existeBarbero] = await Promise.all([
    Usuario.exists({ _id: cliente, rol: 'Cliente', activo: { $ne: false } }),
    Peluqueria.exists({ _id: peluqueria }),
    Usuario.exists({ _id: peluquero, rol: 'Barbero', activo: { $ne: false }, peluqueria_id: peluqueria })
  ]);

  if (!existeCliente) return 'El cliente no existe o no está disponible.';
  if (!existePeluqueria) return 'La barbería no existe.';
  if (!existeBarbero) return 'El barbero no está disponible para esta barbería.';

  // La API aplica las mismas reglas que la interfaz web: horario, bloqueos,
  // barbero activo y solapes.
  return validarCita(
    { Usuario, Horario, Bloqueo, Reserva },
    { peluqueria, peluquero, fecha, hora, minutos: Number(minutos), excluir }
  );
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
    // El cliente y el barbero siempre reservan para sí mismos;
    // solo el Admin puede elegir a quién y con qué estado se crea.
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
      // "YYYY-MM-DDT00:00:00" fija la cita al día escrito, sin hora mezclada.
      fecha: new Date(`${req.body.fecha}T00:00:00`),
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos,
      estado
    });

    // Aviso a los implicados en segundo plano, sin frenar la respuesta.
    await notificarReserva(reserva._id, 'reservada');
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

    if (!['Pendiente', 'Confirmada', 'Reprogramar'].includes(actual.estado)) {
      return res.status(409).json({ mensaje: 'Esta reserva ya no se puede modificar.' });
    }

    const esAdmin = req.usuario.rol === 'Admin';
    if (!esAdmin && actual.estado !== 'Reprogramar' && !dosHorasAntes(actual.fecha, actual.hora)) {
      return res.status(409).json({ mensaje: 'Los cambios deben hacerse con al menos 2 horas de anticipación.' });
    }
    // El Admin puede mover la cita a otro barbero o cambiarle el estado;
    // los demás solo tocan lugar, fecha, hora, servicio y duración.
    const permitidos = esAdmin
      ? ['peluqueria', 'peluquero', 'fecha', 'hora', 'servicio', 'minutos', 'estado']
      : ['peluqueria', 'fecha', 'hora', 'servicio', 'minutos'];

    const cambios = {};
    permitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    });

    if (esAdmin && cambios.estado !== undefined) {
      const permitidosEstado = TRANSICIONES_RESERVA[actual.estado] || [];
      if (!permitidosEstado.includes(cambios.estado)) {
        return res.status(409).json({ mensaje: 'El cambio de estado de la reserva no está permitido.' });
      }
      if (cambios.estado === 'NoAsistio') {
        const fin = new Date(`${claveFecha(actual.fecha)}T${actual.hora}:00`).getTime() + (actual.minutos || 30) * 60000;
        if (fin > Date.now()) return res.status(409).json({ mensaje: 'La cita todavía no ha terminado.' });
      }
      if (cambios.estado === 'Cancelada') cambios.motivo_cancelacion = 'Cancelada por administración.';
      if (cambios.estado !== 'Reprogramar') {
        cambios.requiere_reprogramacion = false;
        cambios.motivo_reprogramacion = '';
      }
    }

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

    // Al revalidar se ignora la propia cita, para que no choque consigo misma.
    const error = await validarReserva({ ...datos, excluir: actual._id });
    if (error) return res.status(400).json({ mensaje: error });

    if (cambios.fecha) cambios.fecha = new Date(`${cambios.fecha}T00:00:00`);

    const reserva = await Reserva.findByIdAndUpdate(actual._id, cambios, { new: true, runValidators: true });
    await notificarReserva(reserva._id, 'modificada');

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

    // Los clientes y barberos cancelan; solo Admin puede borrar el registro.
    if (req.usuario.rol !== 'Admin') {
      return res.status(403).json({ mensaje: 'Las reservas no se eliminan; usa la opción de cancelar.' });
    }

    await reserva.deleteOne();
    res.status(200).json({ mensaje: 'Reserva eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar la reserva.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

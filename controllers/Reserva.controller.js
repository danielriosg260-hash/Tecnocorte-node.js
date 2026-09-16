const Reserva = require('../models/Reserva.model');
const Usuario = require('../models/Usuario.model');
const Peluqueria = require('../models/Peluqueria.model');
const transporter = require('../config/email');
const { enviarCorreoBonito, escapeHtml } = require('../config/emailTemplate');

const escaparHtml = escapeHtml;
const ESTADOS_ACTIVOS = ['Pendiente', 'Confirmada', 'Completada', 'Reprogramar'];
const ESTADOS_VALIDOS = [...ESTADOS_ACTIVOS, 'Cancelada'];
const esId = (value) => require('mongoose').isValidObjectId(value);

const fechaValida = (value) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const fecha = new Date(`${value}T00:00:00`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === value;
};

const fechaInicio = (value) => value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
const minutosHora = (value) => {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return -1;
  const [hora, minuto] = value.split(':').map(Number);
  return hora * 60 + minuto;
};

const validarReserva = async ({ cliente, peluqueria, peluquero, fecha, hora, servicio, minutos, estado, excluir }) => {
  if (![cliente, peluqueria, peluquero].every(esId)) return 'Los identificadores de la reserva no son válidos.';
  const inicio = minutosHora(hora);
  const duracion = Number(minutos);
  if (inicio < 0 || !Number.isInteger(duracion) || duracion < 15 || duracion > 480) return 'La hora o duración de la reserva no son válidas.';
  if (!fechaValida(fecha)) return 'La fecha debe ser válida.';
  if (typeof servicio !== 'string' || !servicio.trim() || servicio.length > 120) return 'El servicio no es válido.';
  const fechaTexto = fecha instanceof Date ? fecha.toISOString().slice(0, 10) : fecha;
  if (new Date(`${fechaTexto}T${hora}:00`) <= new Date()) return 'La fecha y hora deben estar en el futuro.';
  if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) return 'El estado de la reserva no es válido.';

  const [clienteDoc, peluqueriaDoc, peluqueroDoc] = await Promise.all([
    Usuario.findOne({ _id: cliente, rol: 'Cliente', activo: { $ne: false } }).select('_id email nombre'),
    Peluqueria.findById(peluqueria).select('_id nombre'),
    Usuario.findOne({ _id: peluquero, rol: 'Barbero', activo: { $ne: false }, peluqueria_id: peluqueria }).select('_id email nombre')
  ]);
  if (!clienteDoc) return 'El cliente no existe o no está disponible.';
  if (!peluqueriaDoc) return 'La peluquería no existe.';
  if (!peluqueroDoc) return 'El barbero no está disponible para esta peluquería.';

  const inicioFecha = fechaInicio(fecha);
  const finFecha = new Date(inicioFecha);
  finFecha.setDate(finFecha.getDate() + 1);
  const reservas = await Reserva.find({ peluquero, fecha: { $gte: inicioFecha, $lt: finFecha }, estado: { $in: ESTADOS_ACTIVOS }, ...(excluir ? { _id: { $ne: excluir } } : {}) }).select('hora minutos');
  const fin = inicio + duracion;
  if (reservas.some((reserva) => {
    const reservaInicio = minutosHora(reserva.hora);
    return reservaInicio >= 0 && inicio < reservaInicio + (reserva.minutos || 30) && fin > reservaInicio;
  })) return 'Ese horario ya está ocupado.';
  return null;
};

const filtroPropietario = (usuario) => usuario.rol === 'Admin'
  ? {}
  : usuario.rol === 'Barbero' ? { peluquero: usuario._id } : { cliente: usuario._id };

// Controlador de Reserva: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar reservas en la base de datos.

// Crea una reserva nueva y envía correo de confirmación al cliente.
const crear = async (req, res) => {
  try {
    const cliente = req.usuario.rol === 'Cliente' ? req.usuario._id : req.body.cliente;
    const peluquero = req.usuario.rol === 'Barbero' ? req.usuario._id : req.body.peluquero;
    const minutos = Number(req.body.minutos) || 30;
    const estado = req.usuario.rol === 'Admin' ? (req.body.estado || 'Pendiente') : 'Pendiente';
    const error = await validarReserva({ cliente, peluqueria: req.body.peluqueria, peluquero, fecha: req.body.fecha, hora: req.body.hora, servicio: req.body.servicio, minutos, estado });
    if (error) return res.status(400).json({ mensaje: error });
    const reserva = await Reserva.create({
      cliente,
      peluqueria: req.body.peluqueria,
      peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos,
      estado
    });

    // Busca datos del cliente y la peluquería para el correo
    const clienteUsuario = await Usuario.findById(cliente);
    const peluqueria = await Peluqueria.findById(req.body.peluqueria);

    if (clienteUsuario) {
      const fechaFormateada = new Date(reserva.fecha).toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const nombrePeluqueria = peluqueria ? peluqueria.nombre : 'la peluquería';

      try {
        await enviarCorreoBonito(transporter, {
          to: clienteUsuario.email,
          subject: 'Confirmación de tu reserva en TecnoCorte',
          title: 'Tu cita está reservada',
          preheader: 'Hemos guardado tu cita en TecnoCorte.',
          greeting: `¡Hola ${clienteUsuario.nombre}!`,
          content: `<p>Tu cita ha sido reservada exitosamente.</p><p><strong>Peluquería:</strong> ${escaparHtml(nombrePeluqueria)}<br><strong>Fecha:</strong> ${escaparHtml(fechaFormateada)}<br><strong>Hora:</strong> ${escaparHtml(reserva.hora)}<br><strong>Servicio:</strong> ${escaparHtml(reserva.servicio || 'No especificado')}<br><strong>Estado:</strong> ${escaparHtml(reserva.estado)}</p><p>Te esperamos en TecnoCorte.</p>`,
          text: `Tu cita fue reservada en ${nombrePeluqueria} el ${fechaFormateada} a las ${reserva.hora}.`
        });
      } catch (emailError) {
        console.error('Error al enviar correo de reserva:', emailError.message);
      }
    }

    res.status(201).json(reserva);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo crear la reserva.' });
  }
};

// Lista todas las reservas. Con populate(), en vez de mostrar solo los ids
// del cliente y de la peluquería, trae sus datos completos.
const listarTodos = async (req, res) => {
  try {
    const filtro = filtroPropietario(req.usuario);
    const reservas = await Reserva.find(filtro).populate('cliente', 'nombre apellido email telefono rol').populate('peluqueria', 'nombre ubicacion telefono').populate('peluquero', 'nombre apellido email telefono rol');
    res.status(200).json(reservas);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar las reservas' });
  }
};

// Busca una sola reserva por su id. findOne busca la primera que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) }).populate('cliente', 'nombre apellido email telefono rol').populate('peluqueria', 'nombre ubicacion telefono').populate('peluquero', 'nombre apellido email telefono rol');
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }
    res.status(200).json(reserva);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar la reserva' });
  }
};

// Actualiza una reserva. findOneAndUpdate busca la reserva y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con la reserva ya actualizada.
const actualizar = async (req, res) => {
  try {
    const reservaActual = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) });
    if (!reservaActual) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    const esAdmin = req.usuario.rol === 'Admin';
    const camposPermitidos = esAdmin
      ? ['peluqueria', 'peluquero', 'fecha', 'hora', 'servicio', 'minutos', 'estado']
      : ['peluqueria', 'fecha', 'hora', 'servicio', 'minutos'];
    const cambios = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    });
    const datos = {
      cliente: reservaActual.cliente,
      peluqueria: cambios.peluqueria ?? reservaActual.peluqueria,
      peluquero: esAdmin ? (cambios.peluquero ?? reservaActual.peluquero) : reservaActual.peluquero,
      fecha: cambios.fecha ?? reservaActual.fecha,
      hora: cambios.hora ?? reservaActual.hora,
      servicio: cambios.servicio ?? reservaActual.servicio,
      minutos: cambios.minutos !== undefined ? Number(cambios.minutos) : reservaActual.minutos,
      estado: esAdmin ? (cambios.estado ?? reservaActual.estado) : reservaActual.estado
    };
    const error = await validarReserva({ ...datos, excluir: reservaActual._id });
    if (error) return res.status(400).json({ mensaje: error });
    const reserva = await Reserva.findOneAndUpdate({ _id: reservaActual._id }, cambios, { new: true, runValidators: true });
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }
    res.status(200).json(reserva);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de reserva inválidos.' });
  }
};

// Elimina una reserva por su id. findOneAndDelete busca la reserva y la elimina.
const eliminar = async (req, res) => {
  try {
    const reservaActual = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) });
    if (!reservaActual) return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    if (req.usuario.rol !== 'Admin' && ['Completada', 'Cancelada'].includes(reservaActual.estado)) {
      return res.status(409).json({ mensaje: 'Esta reserva ya no se puede eliminar.' });
    }
    const reserva = await Reserva.findByIdAndDelete(reservaActual._id);
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }
    res.status(200).json({ mensaje: 'Reserva eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar la reserva' });
  }
};

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar
};

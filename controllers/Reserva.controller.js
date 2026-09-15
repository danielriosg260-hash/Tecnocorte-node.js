const Reserva = require('../models/Reserva.model');
const Usuario = require('../models/Usuario.model');
const Peluqueria = require('../models/Peluqueria.model');
const transporter = require('../config/email');
const { enviarCorreoBonito, escapeHtml } = require('../config/emailTemplate');

const escaparHtml = escapeHtml;

// Controlador de Reserva: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar reservas en la base de datos.

// Crea una reserva nueva y envía correo de confirmación al cliente.
const crear = async (req, res) => {
  try {
    const cliente = req.usuario.rol === 'Admin' ? req.body.cliente : req.usuario._id;
    const reserva = await Reserva.create({
      cliente,
      peluqueria: req.body.peluqueria,
      peluquero: req.body.peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos: Number(req.body.minutos) || 30
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
    res.status(400).json({ mensaje: error.message });
  }
};

// Lista todas las reservas. Con populate(), en vez de mostrar solo los ids
// del cliente y de la peluquería, trae sus datos completos.
const listarTodos = async (req, res) => {
  try {
    const filtro = req.usuario.rol === 'Admin' ? {} : req.usuario.rol === 'Barbero' ? { peluquero: req.usuario._id } : { cliente: req.usuario._id };
    const reservas = await Reserva.find(filtro).populate('cliente').populate('peluqueria').populate('peluquero');
    res.status(200).json(reservas);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca una sola reserva por su id. findOne busca la primera que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id, ...(req.usuario.rol === 'Admin' ? {} : req.usuario.rol === 'Barbero' ? { peluquero: req.usuario._id } : { cliente: req.usuario._id }) }).populate('cliente').populate('peluqueria').populate('peluquero');
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }
    res.status(200).json(reserva);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza una reserva. findOneAndUpdate busca la reserva y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con la reserva ya actualizada.
const actualizar = async (req, res) => {
  try {
    const filtro = req.usuario.rol === 'Admin' ? {} : req.usuario.rol === 'Barbero' ? { peluquero: req.usuario._id } : { cliente: req.usuario._id };
    const cambios = {};
    ['peluqueria', 'peluquero', 'fecha', 'hora', 'servicio', 'minutos', 'estado'].forEach((campo) => {
      if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    });
    const reserva = await Reserva.findOneAndUpdate({ _id: req.params.id, ...filtro }, cambios, { new: true, runValidators: true });
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }
    res.status(200).json(reserva);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Elimina una reserva por su id. findOneAndDelete busca la reserva y la elimina.
const eliminar = async (req, res) => {
  try {
    const filtro = req.usuario.rol === 'Admin' ? {} : req.usuario.rol === 'Barbero' ? { peluquero: req.usuario._id } : { cliente: req.usuario._id };
    const reserva = await Reserva.findOneAndDelete({ _id: req.params.id, ...filtro });
    if (!reserva) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }
    res.status(200).json({ mensaje: 'Reserva eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar
};

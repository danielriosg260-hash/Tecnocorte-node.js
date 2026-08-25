const Reserva = require('../models/Reserva.model');
const Usuario = require('../models/Usuario.model');
const Peluqueria = require('../models/Peluqueria.model');
const transporter = require('../config/email');

// Controlador de Reserva: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar reservas en la base de datos.

// Crea una reserva nueva y envía correo de confirmación al cliente.
const crear = async (req, res) => {
  try {
    const reserva = await Reserva.create(req.body);

    // Busca datos del cliente y la peluquería para el correo
    const cliente = await Usuario.findById(req.body.cliente);
    const peluqueria = await Peluqueria.findById(req.body.peluqueria);

    if (cliente) {
      const fechaFormateada = new Date(reserva.fecha).toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const nombrePeluqueria = peluqueria ? peluqueria.nombre : 'la peluquería';

      try {
        await transporter.sendMail({
          from: `"TecnoCorte" <${process.env.EMAIL_USER}>`,
          to: cliente.email,
          subject: 'Confirmación de tu reserva en TecnoCorte',
          html: `
            <h1>¡Hola ${cliente.nombre}!</h1>
            <p>Tu cita ha sido reservada exitosamente.</p>
            <p><strong>Peluquería:</strong> ${nombrePeluqueria}</p>
            <p><strong>Fecha:</strong> ${fechaFormateada}</p>
            <p><strong>Hora:</strong> ${reserva.hora}</p>
            <p><strong>Servicio:</strong> ${reserva.servicio || 'No especificado'}</p>
            <p><strong>Estado:</strong> ${reserva.estado}</p>
            <p>Te esperamos en TecnoCorte.</p>
          `
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
    const reservas = await Reserva.find().populate('cliente').populate('peluqueria');
    res.status(200).json(reservas);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca una sola reserva por su id. findOne busca la primera que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id }).populate('cliente').populate('peluqueria');
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
    const reserva = await Reserva.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
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
    const reserva = await Reserva.findOneAndDelete({ _id: req.params.id });
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

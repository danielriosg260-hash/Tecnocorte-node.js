const Reserva = require('../models/Reserva.model');

// Controlador de Reserva: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar reservas en la base de datos.

// Crea una reserva nueva. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const reserva = await Reserva.create(req.body);
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

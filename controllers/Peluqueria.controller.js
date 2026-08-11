const Peluqueria = require('../models/Peluqueria.model');

// Controlador de Peluqueria: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar peluquerías en la base de datos.

// Crea una peluquería nueva. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.create(req.body);
    res.status(201).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Lista todas las peluquerías que hay guardadas.
const listarTodos = async (req, res) => {
  try {
    const peluquerias = await Peluqueria.find();
    res.status(200).json(peluquerias);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca una sola peluquería por su id. findOne busca la primera que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.findOne({ _id: req.params.id });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
    }
    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza una peluquería. findOneAndUpdate busca la peluquería y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con la peluquería ya actualizada.
const actualizar = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
    }
    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Elimina una peluquería por su id. findOneAndDelete busca la peluquería y la elimina.
const eliminar = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.findOneAndDelete({ _id: req.params.id });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
    }
    res.status(200).json({ mensaje: 'Peluquería eliminada correctamente' });
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

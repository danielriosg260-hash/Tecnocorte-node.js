const Peluqueria = require('../models/Peluqueria.model');
const Reserva = require('../models/Reserva.model');
const Usuario = require('../models/Usuario.model');
const Horario = require('../models/Horario.model');
const Bloqueo = require('../models/Bloqueo.model');

const camposPeluqueria = (body) => ({
  nombre: body.nombre,
  ubicacion: body.ubicacion,
  telefono: body.telefono
});

const crear = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.create(camposPeluqueria(req.body));
    res.status(201).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de peluquería inválidos' });
  }
};

const listarTodos = async (req, res) => {
  try {
    const peluquerias = await Peluqueria.find();
    res.status(200).json(peluquerias);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar las peluquerías' });
  }
};

const listarUno = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.findOne({ _id: req.params.id });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
    }
    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar la peluquería' });
  }
};

const actualizar = async (req, res) => {
  try {
    const peluqueria = await Peluqueria.findOneAndUpdate({ _id: req.params.id }, camposPeluqueria(req.body), { new: true, runValidators: true });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
    }
    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de peluquería inválidos' });
  }
};

const eliminar = async (req, res) => {
  try {
    const [reservas, usuarios, horarios, bloqueos] = await Promise.all([
      Reserva.countDocuments({ peluqueria: req.params.id }),
      Usuario.countDocuments({ peluqueria_id: req.params.id }),
      Horario.countDocuments({ peluqueria: req.params.id }),
      Bloqueo.countDocuments({ peluqueria: req.params.id })
    ]);
    if (reservas || usuarios || horarios || bloqueos) return res.status(409).json({ mensaje: 'No se puede eliminar una peluquería con datos relacionados' });
    const peluqueria = await Peluqueria.findOneAndDelete({ _id: req.params.id });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: 'Peluquería no encontrada' });
    }
    res.status(200).json({ mensaje: 'Peluquería eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar la peluquería' });
  }
};

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar
};

const Peluqueria = require("../models/peluqueria.model");
const Reserva = require("../models/reserva.model");
const Usuario = require("../models/usuario.model");
const Horario = require("../models/horario.model");
const Bloqueo = require("../models/bloqueo.model");

const camposPeluqueria = (body) => ({
  nombre: body.nombre,
  ubicacion: body.ubicacion,
  telefono: body.telefono,
});

async function crear(req, res) {
  try {
    const peluqueria = await Peluqueria.create(camposPeluqueria(req.body));
    res.status(201).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de peluquería inválidos" });
  }
}

async function listarTodos(req, res) {
  try {
    const peluquerias = await Peluqueria.find();
    res.status(200).json(peluquerias);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudieron cargar las peluquerías" });
  }
}

async function listarUno(req, res) {
  try {
    const peluqueria = await Peluqueria.findOne({ _id: req.params.id });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: "Peluquería no encontrada" });
    }
    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo cargar la peluquería" });
  }
}

async function actualizar(req, res) {
  try {
    const peluqueria = await Peluqueria.findOneAndUpdate({ _id: req.params.id }, camposPeluqueria(req.body), {
      new: true,
      runValidators: true,
    });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: "Peluquería no encontrada" });
    }
    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de peluquería inválidos" });
  }
}

async function eliminar(req, res) {
  try {
    const reservas = await Reserva.countDocuments({ peluqueria: req.params.id });
    const usuarios = await Usuario.countDocuments({ peluqueria_id: req.params.id });
    const horarios = await Horario.countDocuments({ peluqueria: req.params.id });
    const bloqueos = await Bloqueo.countDocuments({ peluqueria: req.params.id });
    const tieneRelacionados = reservas > 0 || usuarios > 0 || horarios > 0 || bloqueos > 0;
    if (tieneRelacionados) {
      return res.status(409).json({ mensaje: "No se puede eliminar una peluquería con datos relacionados" });
    }
    const peluqueria = await Peluqueria.findOneAndDelete({ _id: req.params.id });
    if (!peluqueria) {
      return res.status(404).json({ mensaje: "Peluquería no encontrada" });
    }
    res.status(200).json({ mensaje: "Peluquería eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo eliminar la peluquería" });
  }
}

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar,
};

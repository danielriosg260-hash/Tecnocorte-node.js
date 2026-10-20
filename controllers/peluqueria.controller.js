/**
 * API de barberías (peluquerías): listado público y CRUD de administración,
 * con la particularidad de no poder borrar un local que ya tenga citas.
 */
const Peluqueria = require('../models/peluqueria.model');
const Reserva = require('../models/reserva.model');

/** Lista todas las barberías. */
async function find(req, res) {
  try {
    const peluquerias = await Peluqueria.find().sort({ nombre: 1 });
    res.status(200).json(peluquerias);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar las barberías.' });
  }
}

/** Busca una barbería por su id. */
async function findOne(req, res) {
  try {
    const peluqueria = await Peluqueria.findById(req.params.id);

    if (!peluqueria) return res.status(404).json({ mensaje: 'Barbería no encontrada.' });

    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar la barbería.' });
  }
}

/** Crea una barbería. */
async function insertOne(req, res) {
  try {
    const peluqueria = await Peluqueria.create({
      nombre: req.body.nombre,
      ubicacion: req.body.ubicacion,
      telefono: req.body.telefono,
      descripcion: req.body.descripcion,
      imagen: req.body.imagen,
      dueno: req.body.dueno
    });

    res.status(201).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de la barbería inválidos.' });
  }
}

/** Actualiza una barbería. */
async function findOneAndUpdate(req, res) {
  try {
    // Solo se copian los campos enviados; los que faltan quedan como estaban.
    const campos = ['nombre', 'ubicacion', 'telefono', 'descripcion', 'imagen', 'dueno'];
    const cambios = {};

    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    });

    const peluqueria = await Peluqueria.findByIdAndUpdate(req.params.id, cambios, { new: true, runValidators: true });
    if (!peluqueria) return res.status(404).json({ mensaje: 'Barbería no encontrada.' });

    res.status(200).json(peluqueria);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de la barbería inválidos.' });
  }
}

/** Elimina una barbería sin citas. */
async function findOneAndDelete(req, res) {
  try {
    // Regla de integridad: la barbería se elimina solo si no tiene citas.
    if (await Reserva.exists({ peluqueria: req.params.id })) {
      return res.status(409).json({ mensaje: 'No se puede eliminar una barbería con citas.' });
    }

    const peluqueria = await Peluqueria.findByIdAndDelete(req.params.id);
    if (!peluqueria) return res.status(404).json({ mensaje: 'Barbería no encontrada.' });

    res.status(200).json({ mensaje: 'Barbería eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar la barbería.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

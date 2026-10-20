const Usuario = require('../models/usuario.model');
const { aObjeto } = require('../utils/objetos');

/** Lista todos los usuarios (sin la contraseña). */
async function find(req, res) {
  try {
    const usuarios = await Usuario.find().sort({ createdAt: -1 });
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar los usuarios.' });
  }
}

/** Busca un usuario por su id. */
async function findOne(req, res) {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar el usuario.' });
  }
}

/** Crea un usuario. */
async function insertOne(req, res) {
  try {
    const usuario = await Usuario.create({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      password: req.body.password,
      telefono: req.body.telefono,
      rol: req.body.rol,
      peluqueria_id: req.body.peluqueria_id
    });

    res.status(201).json(aObjeto(usuario));
  } catch (error) {
    const mensaje = error.code === 11000 ? 'El correo ya está registrado.' : 'No se pudo crear el usuario.';
    res.status(400).json({ mensaje });
  }
}

/** Actualiza un usuario. */
async function findOneAndUpdate(req, res) {
  try {
    const usuario = await Usuario.findById(req.params.id).select('+password +tokenVersion');
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    ['nombre', 'apellido', 'email', 'telefono', 'rol', 'activo', 'peluqueria_id'].forEach((campo) => {
      if (req.body[campo] !== undefined) usuario[campo] = req.body[campo];
    });

    if (req.body.password !== undefined) usuario.password = req.body.password;

    await usuario.save();
    res.status(200).json(aObjeto(usuario));
  } catch (error) {
    const mensaje = error.code === 11000 ? 'El correo ya está registrado.' : 'No se pudo actualizar el usuario.';
    res.status(400).json({ mensaje });
  }
}

/** Elimina un usuario. */
async function findOneAndDelete(req, res) {
  try {
    if (String(req.params.id) === String(req.usuario._id)) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario.' });
    }

    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    res.status(200).json({ mensaje: 'Usuario eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar el usuario.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

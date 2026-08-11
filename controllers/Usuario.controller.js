const Usuario = require('../models/Usuario.model');

// Controlador de Usuario: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar usuarios en la base de datos.

// Crea un usuario nuevo. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const usuario = await Usuario.create(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Lista todos los usuarios que hay guardados.
const listarTodos = async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca un solo usuario por su id. findOne busca el primero que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({ _id: req.params.id });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza un usuario. findOneAndUpdate busca el usuario y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con el usuario ya actualizado.
const actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Elimina un usuario por su id. findOneAndDelete busca el usuario y lo elimina.
const eliminar = async (req, res) => {
  try {
    const usuario = await Usuario.findOneAndDelete({ _id: req.params.id });
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
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

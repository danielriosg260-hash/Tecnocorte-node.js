const Pedido = require('../models/Pedido.model');

// Controlador de Pedido: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar pedidos en la base de datos.

// Crea un pedido nuevo. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const pedido = await Pedido.create(req.body);
    res.status(201).json(pedido);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Lista todos los pedidos. Con populate(), en vez de mostrar solo el id
// del cliente, trae los datos completos del usuario que hizo el pedido.
const listarTodos = async (req, res) => {
  try {
    const pedidos = await Pedido.find().populate('cliente');
    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca un solo pedido por su id. findOne busca el primero que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const pedido = await Pedido.findOne({ _id: req.params.id }).populate('cliente');
    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }
    res.status(200).json(pedido);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza un pedido. findOneAndUpdate busca el pedido y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con el pedido ya actualizado.
const actualizar = async (req, res) => {
  try {
    const pedido = await Pedido.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }
    res.status(200).json(pedido);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Elimina un pedido por su id. findOneAndDelete busca el pedido y lo elimina.
const eliminar = async (req, res) => {
  try {
    const pedido = await Pedido.findOneAndDelete({ _id: req.params.id });
    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }
    res.status(200).json({ mensaje: 'Pedido eliminado correctamente' });
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

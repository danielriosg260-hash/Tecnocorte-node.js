const PedidoProducto = require('../models/PedidoProducto.model');

// Controlador de PedidoProducto: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar las líneas de pedido (qué producto
// se pidió, en qué pedido, cuántos y a qué precio).

// Crea una línea de pedido nueva. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const pedidoProducto = await PedidoProducto.create(req.body);
    res.status(201).json(pedidoProducto);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Lista todas las líneas de pedido. Con populate(), en vez de mostrar solo los ids
// del pedido y del producto, trae sus datos completos.
const listarTodos = async (req, res) => {
  try {
    const pedidosProducto = await PedidoProducto.find().populate('pedido').populate('producto');
    res.status(200).json(pedidosProducto);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca una sola línea de pedido por su id. findOne busca la primera que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const pedidoProducto = await PedidoProducto.findOne({ _id: req.params.id }).populate('pedido').populate('producto');
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: 'Línea de pedido no encontrada' });
    }
    res.status(200).json(pedidoProducto);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza una línea de pedido. findOneAndUpdate busca la línea y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con la línea ya actualizada.
const actualizar = async (req, res) => {
  try {
    const pedidoProducto = await PedidoProducto.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: 'Línea de pedido no encontrada' });
    }
    res.status(200).json(pedidoProducto);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Elimina una línea de pedido por su id. findOneAndDelete busca la línea y la elimina.
const eliminar = async (req, res) => {
  try {
    const pedidoProducto = await PedidoProducto.findOneAndDelete({ _id: req.params.id });
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: 'Línea de pedido no encontrada' });
    }
    res.status(200).json({ mensaje: 'Línea de pedido eliminada correctamente' });
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

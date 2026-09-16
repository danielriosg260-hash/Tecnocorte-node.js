const PedidoProducto = require('../models/PedidoProducto.model');
const mongoose = require('mongoose');

const camposLinea = (body, parcial = false) => {
  const campos = {};
  if (!parcial || body.pedido !== undefined) campos.pedido = body.pedido;
  if (!parcial || body.producto !== undefined) campos.producto = body.producto;
  if (!parcial || body.cantidad !== undefined) campos.cantidad = Number(body.cantidad);
  if (!parcial || body.precio !== undefined) campos.precio = Number(body.precio);
  return campos;
};

// Controlador de PedidoProducto: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar las líneas de pedido (qué producto
// se pidió, en qué pedido, cuántos y a qué precio).

// Crea una línea de pedido nueva. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const datos = camposLinea(req.body);
    if (!mongoose.isValidObjectId(datos.pedido) || !mongoose.isValidObjectId(datos.producto) || !Number.isInteger(datos.cantidad) || datos.cantidad < 1 || !Number.isFinite(datos.precio) || datos.precio < 0) {
      return res.status(400).json({ mensaje: 'Datos de línea de pedido inválidos' });
    }
    const pedidoProducto = await PedidoProducto.create(datos);
    res.status(201).json(pedidoProducto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de línea de pedido inválidos' });
  }
};

// Lista todas las líneas de pedido. Con populate(), en vez de mostrar solo los ids
// del pedido y del producto, trae sus datos completos.
const listarTodos = async (req, res) => {
  try {
    const pedidosProducto = await PedidoProducto.find().populate('pedido', 'cliente fecha total estado').populate('producto', 'nombre precio categoria imagen');
    res.status(200).json(pedidosProducto);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar las líneas de pedido' });
  }
};

// Busca una sola línea de pedido por su id. findOne busca la primera que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const pedidoProducto = await PedidoProducto.findOne({ _id: req.params.id }).populate('pedido', 'cliente fecha total estado').populate('producto', 'nombre precio categoria imagen');
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: 'Línea de pedido no encontrada' });
    }
    res.status(200).json(pedidoProducto);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar la línea de pedido' });
  }
};

// Actualiza una línea de pedido. findOneAndUpdate busca la línea y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con la línea ya actualizada.
const actualizar = async (req, res) => {
  try {
    const pedidoProducto = await PedidoProducto.findOneAndUpdate({ _id: req.params.id }, camposLinea(req.body, true), { new: true, runValidators: true });
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: 'Línea de pedido no encontrada' });
    }
    res.status(200).json(pedidoProducto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de línea de pedido inválidos' });
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
    res.status(500).json({ mensaje: 'No se pudo eliminar la línea de pedido' });
  }
};

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar
};

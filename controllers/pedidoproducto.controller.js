const PedidoProducto = require("../models/pedidoproducto.model");
const mongoose = require("mongoose");

function camposLinea(body, parcial = false) {
  const campos = {};
  if (!parcial || body.pedido !== undefined) campos.pedido = body.pedido;
  if (!parcial || body.producto !== undefined) campos.producto = body.producto;
  if (!parcial || body.cantidad !== undefined) campos.cantidad = Number(body.cantidad);
  if (!parcial || body.precio !== undefined) campos.precio = Number(body.precio);
  return campos;
}

async function crear(req, res) {
  try {
    const datos = camposLinea(req.body);
    const pedidoOk = mongoose.isValidObjectId(datos.pedido);
    const productoOk = mongoose.isValidObjectId(datos.producto);
    const cantidadOk = Number.isInteger(datos.cantidad) && datos.cantidad >= 1;
    const precioOk = Number.isFinite(datos.precio) && datos.precio >= 0;
    if (!pedidoOk || !productoOk || !cantidadOk || !precioOk) {
      return res.status(400).json({ mensaje: "Datos de línea de pedido inválidos" });
    }
    const pedidoProducto = await PedidoProducto.create(datos);
    res.status(201).json(pedidoProducto);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de línea de pedido inválidos" });
  }
}

async function listarTodos(req, res) {
  try {
    const pedidosProducto = await PedidoProducto.find()
      .populate("pedido", "cliente fecha total estado")
      .populate("producto", "nombre precio categoria imagen");
    res.status(200).json(pedidosProducto);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudieron cargar las líneas de pedido" });
  }
}

async function listarUno(req, res) {
  try {
    const pedidoProducto = await PedidoProducto.findOne({ _id: req.params.id })
      .populate("pedido", "cliente fecha total estado")
      .populate("producto", "nombre precio categoria imagen");
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: "Línea de pedido no encontrada" });
    }
    res.status(200).json(pedidoProducto);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo cargar la línea de pedido" });
  }
}

async function actualizar(req, res) {
  try {
    const pedidoProducto = await PedidoProducto.findOneAndUpdate(
      { _id: req.params.id },
      camposLinea(req.body, true),
      { new: true, runValidators: true },
    );
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: "Línea de pedido no encontrada" });
    }
    res.status(200).json(pedidoProducto);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de línea de pedido inválidos" });
  }
}

async function eliminar(req, res) {
  try {
    const pedidoProducto = await PedidoProducto.findOneAndDelete({ _id: req.params.id });
    if (!pedidoProducto) {
      return res.status(404).json({ mensaje: "Línea de pedido no encontrada" });
    }
    res.status(200).json({ mensaje: "Línea de pedido eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo eliminar la línea de pedido" });
  }
}

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar,
};

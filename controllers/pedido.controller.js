const Pedido = require("../models/pedido.model");
const mongoose = require("mongoose");

function camposPedido(body, parcial = false) {
  const campos = {};
  if (!parcial || body.cliente !== undefined) campos.cliente = body.cliente;
  if (!parcial || body.total !== undefined) campos.total = Number(body.total);
  if (!parcial || body.estado !== undefined) campos.estado = body.estado;
  return campos;
}

async function crear(req, res) {
  try {
    const datos = camposPedido(req.body);
    if (!mongoose.isValidObjectId(datos.cliente) || !Number.isFinite(datos.total) || datos.total < 0) {
      return res.status(400).json({ mensaje: "Datos de pedido inválidos" });
    }
    const pedido = await Pedido.create(datos);
    res.status(201).json(pedido);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de pedido inválidos" });
  }
}

async function listarTodos(req, res) {
  try {
    const pedidos = await Pedido.find().populate("cliente", "nombre apellido email telefono rol");
    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudieron cargar los pedidos" });
  }
}

async function listarUno(req, res) {
  try {
    const pedido = await Pedido.findOne({ _id: req.params.id }).populate(
      "cliente",
      "nombre apellido email telefono rol",
    );
    if (!pedido) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }
    res.status(200).json(pedido);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo cargar el pedido" });
  }
}

async function actualizar(req, res) {
  try {
    const pedido = await Pedido.findOneAndUpdate({ _id: req.params.id }, camposPedido(req.body, true), {
      new: true,
      runValidators: true,
    });
    if (!pedido) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }
    res.status(200).json(pedido);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de pedido inválidos" });
  }
}

async function eliminar(req, res) {
  try {
    const pedido = await Pedido.findOneAndDelete({ _id: req.params.id });
    if (!pedido) {
      return res.status(404).json({ mensaje: "Pedido no encontrado" });
    }
    res.status(200).json({ mensaje: "Pedido eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo eliminar el pedido" });
  }
}

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar,
};

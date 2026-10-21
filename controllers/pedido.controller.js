/** API de pedidos con control de stock, transiciones y restauración segura. */
const mongoose = require('mongoose');
const Pedido = require('../models/pedido.model');
const PedidoProducto = require('../models/pedidoproducto.model');
const Producto = require('../models/producto.model');

const TRANSICIONES = {
  Pendiente: ['Pendiente', 'Listo', 'Entregado', 'Cancelado'],
  Listo: ['Listo', 'Entregado', 'Cancelado'],
  Entregado: ['Entregado'],
  Cancelado: ['Cancelado']
};

async function calcularTotal(productos) {
  if (!Array.isArray(productos) || !productos.length) return null;

  let total = 0;
  const lineas = [];
  for (const item of productos) {
    const producto = await Producto.findOne({ _id: item.producto, disponible: true });
    const cantidad = Number(item.cantidad);
    if (!producto || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > producto.stock) return null;
    total += producto.precio * cantidad;
    lineas.push({ producto: producto._id, cantidad, precio: producto.precio });
  }
  return { total, lineas };
}

async function find(req, res) {
  try {
    const filtro = ['Admin', 'Barbero'].includes(req.usuario.rol) ? {} : { cliente: req.usuario._id };
    const pedidos = await Pedido.find(filtro).populate('cliente', 'nombre apellido email').sort({ fecha: -1 });
    res.status(200).json(pedidos);
  } catch {
    res.status(500).json({ mensaje: 'No se pudieron cargar los pedidos.' });
  }
}

async function findOne(req, res) {
  try {
    const filtro = ['Admin', 'Barbero'].includes(req.usuario.rol) ? {} : { cliente: req.usuario._id };
    const pedido = await Pedido.findOne({ _id: req.params.id, ...filtro }).populate('cliente', 'nombre apellido email');
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    const productos = await PedidoProducto.find({ pedido: pedido._id }).populate('producto');
    res.status(200).json({ ...pedido.toObject(), productos });
  } catch {
    res.status(500).json({ mensaje: 'No se pudo cargar el pedido.' });
  }
}

async function insertOne(req, res) {
  const sesion = await mongoose.startSession();
  try {
    const cliente = req.usuario.rol === 'Cliente' ? req.usuario._id : req.body.cliente;
    const calculo = await calcularTotal(req.body.productos);
    if (!cliente || !calculo) return res.status(400).json({ mensaje: 'Los datos del pedido no son válidos.' });

    let pedido;
    await sesion.withTransaction(async () => {
      for (const linea of calculo.lineas) {
        const actualizado = await Producto.findOneAndUpdate(
          { _id: linea.producto, disponible: true, stock: { $gte: linea.cantidad } },
          { $inc: { stock: -linea.cantidad } },
          { new: true, session: sesion }
        );
        if (!actualizado) throw new Error('stock');
      }
      [pedido] = await Pedido.create([{ cliente, total: calculo.total }], { session: sesion });
      await PedidoProducto.insertMany(
        calculo.lineas.map((linea) => ({ pedido: pedido._id, ...linea })),
        { session: sesion }
      );
    });
    res.status(201).json(pedido);
  } catch {
    res.status(409).json({ mensaje: 'No se pudo completar el pedido. Verifica el stock.' });
  } finally {
    await sesion.endSession();
  }
}

async function findOneAndUpdate(req, res) {
  const sesion = await mongoose.startSession();
  try {
    let resultado;
    await sesion.withTransaction(async () => {
      const pedido = await Pedido.findById(req.params.id).session(sesion);
      if (!pedido) throw Object.assign(new Error(), { status: 404 });

      const estado = req.body.estado === undefined ? pedido.estado : req.body.estado;
      if (!(TRANSICIONES[pedido.estado] || []).includes(estado)) throw Object.assign(new Error(), { status: 409 });

      if (estado === 'Cancelado' && pedido.estado !== 'Cancelado') {
        const lineas = await PedidoProducto.find({ pedido: pedido._id }).session(sesion);
        for (const linea of lineas) {
          await Producto.findByIdAndUpdate(linea.producto, { $inc: { stock: linea.cantidad } }, { session: sesion });
        }
      }

      pedido.estado = estado;
      if (req.body.pago_confirmado !== undefined) {
        const confirmado = req.body.pago_confirmado === true || req.body.pago_confirmado === 'true' || req.body.pago_confirmado === 'on';
        pedido.pago_confirmado = confirmado;
        pedido.fecha_pago = confirmado ? (pedido.fecha_pago || new Date()) : null;
      }
      if (estado === 'Entregado') pedido.fecha_entrega = pedido.fecha_entrega || new Date();
      await pedido.save({ session: sesion });
      resultado = pedido;
    });
    res.status(200).json(resultado);
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.status === 409 ? 'El cambio de estado no está permitido.' : 'No se pudo actualizar el pedido.' });
  } finally {
    await sesion.endSession();
  }
}

async function findOneAndDelete(req, res) {
  const sesion = await mongoose.startSession();
  try {
    await sesion.withTransaction(async () => {
      const pedido = await Pedido.findById(req.params.id).session(sesion);
      if (!pedido) throw Object.assign(new Error(), { status: 404 });

      if (pedido.estado !== 'Cancelado') {
        const lineas = await PedidoProducto.find({ pedido: pedido._id }).session(sesion);
        for (const linea of lineas) {
          await Producto.findByIdAndUpdate(linea.producto, { $inc: { stock: linea.cantidad } }, { session: sesion });
        }
      }
      await PedidoProducto.deleteMany({ pedido: pedido._id }, { session: sesion });
      await pedido.deleteOne({ session: sesion });
    });
    res.status(200).json({ mensaje: 'Pedido eliminado correctamente.' });
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.status === 404 ? 'Pedido no encontrado.' : 'No se pudo eliminar el pedido.' });
  } finally {
    await sesion.endSession();
  }
}

module.exports = { find, findOne, findOneAndDelete, findOneAndUpdate, insertOne };

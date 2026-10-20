const Pedido = require('../models/pedido.model');
const PedidoProducto = require('../models/pedidoproducto.model');
const Producto = require('../models/producto.model');

/** Calcula el total del pedido a partir de los productos enviados. */
async function calcularTotal(productos) {
  if (!Array.isArray(productos) || !productos.length) return null;

  let total = 0;
  const lineas = [];

  for (const item of productos) {
    const producto = await Producto.findById(item.producto);
    const cantidad = Number(item.cantidad);

    if (!producto || !Number.isInteger(cantidad) || cantidad < 1) return null;

    total += producto.precio * cantidad;
    lineas.push({ producto: producto._id, cantidad, precio: producto.precio });
  }

  return { total, lineas };
}

/** Lista los pedidos (el cliente solo ve los suyos). */
async function find(req, res) {
  try {
    const filtro = ['Admin', 'Barbero'].includes(req.usuario.rol) ? {} : { cliente: req.usuario._id };
    const pedidos = await Pedido.find(filtro).populate('cliente', 'nombre apellido email').sort({ fecha: -1 });

    res.status(200).json(pedidos);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar los pedidos.' });
  }
}

/** Busca un pedido por su id. */
async function findOne(req, res) {
  try {
    const filtro = ['Admin', 'Barbero'].includes(req.usuario.rol) ? {} : { cliente: req.usuario._id };
    const pedido = await Pedido.findOne({ _id: req.params.id, ...filtro }).populate('cliente', 'nombre apellido email');

    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado.' });

    const productos = await PedidoProducto.find({ pedido: pedido._id }).populate('producto');
    res.status(200).json({ ...pedido.toObject(), productos });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar el pedido.' });
  }
}

/** Crea un pedido con sus productos. */
async function insertOne(req, res) {
  try {
    const cliente = req.usuario.rol === 'Cliente' ? req.usuario._id : req.body.cliente;
    const calculo = await calcularTotal(req.body.productos);

    if (!cliente || !calculo) return res.status(400).json({ mensaje: 'Los datos del pedido no son válidos.' });

    const pedido = await Pedido.create({ cliente, total: calculo.total });

    await PedidoProducto.insertMany(
      calculo.lineas.map((linea) => ({ pedido: pedido._id, ...linea }))
    );

    res.status(201).json(pedido);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo crear el pedido.' });
  }
}

/** Cambia el estado de un pedido (solo administradores). */
async function findOneAndUpdate(req, res) {
  try {
    const cambios = {};
    if (req.body.estado !== undefined) cambios.estado = req.body.estado;
    if (req.body.pago_confirmado !== undefined) cambios.pago_confirmado = Boolean(req.body.pago_confirmado);

    const pedido = await Pedido.findByIdAndUpdate(req.params.id, cambios, { new: true, runValidators: true });
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado.' });

    res.status(200).json(pedido);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo actualizar el pedido.' });
  }
}

/** Elimina un pedido y sus líneas. */
async function findOneAndDelete(req, res) {
  try {
    const pedido = await Pedido.findByIdAndDelete(req.params.id);
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado.' });

    await PedidoProducto.deleteMany({ pedido: pedido._id });
    res.status(200).json({ mensaje: 'Pedido eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar el pedido.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

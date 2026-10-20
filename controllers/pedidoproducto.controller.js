const PedidoProducto = require('../models/pedidoproducto.model');
const Pedido = require('../models/pedido.model');

/** Revisa que el usuario pueda ver el pedido indicado. */
async function puedeVer(req, pedidoId) {
  if (['Admin', 'Barbero'].includes(req.usuario.rol)) return true;
  return Boolean(await Pedido.exists({ _id: pedidoId, cliente: req.usuario._id }));
}

/** Lista las líneas de los pedidos. */
async function find(req, res) {
  try {
    const filtro = req.query.pedido ? { pedido: req.query.pedido } : {};

    if (req.query.pedido && !(await puedeVer(req, req.query.pedido))) {
      return res.status(403).json({ mensaje: 'No puedes ver este pedido.' });
    }

    const lineas = await PedidoProducto.find(filtro).populate('producto');
    res.status(200).json(lineas);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar los productos del pedido.' });
  }
}

/** Busca una línea por su id. */
async function findOne(req, res) {
  try {
    const linea = await PedidoProducto.findById(req.params.id).populate('producto');
    if (!linea) return res.status(404).json({ mensaje: 'Producto del pedido no encontrado.' });

    res.status(200).json(linea);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar el producto del pedido.' });
  }
}

/** Agrega un producto a un pedido. */
async function insertOne(req, res) {
  try {
    const cantidad = Number(req.body.cantidad);
    const precio = Number(req.body.precio);

    if (!Number.isInteger(cantidad) || cantidad < 1 || !Number.isFinite(precio) || precio < 0) {
      return res.status(400).json({ mensaje: 'La cantidad o el precio no son válidos.' });
    }

    const linea = await PedidoProducto.create({
      pedido: req.body.pedido,
      producto: req.body.producto,
      cantidad,
      precio
    });

    const lineas = await PedidoProducto.find({ pedido: req.body.pedido });
    await Pedido.findByIdAndUpdate(req.body.pedido, {
      total: lineas.reduce((total, item) => total + item.precio * item.cantidad, 0)
    });

    res.status(201).json(linea);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo agregar el producto al pedido.' });
  }
}

/** Actualiza la cantidad o el precio de una línea. */
async function findOneAndUpdate(req, res) {
  try {
    const cambios = {};
    if (req.body.cantidad !== undefined) cambios.cantidad = Number(req.body.cantidad);
    if (req.body.precio !== undefined) cambios.precio = Number(req.body.precio);

    const linea = await PedidoProducto.findByIdAndUpdate(req.params.id, cambios, { new: true, runValidators: true });
    if (!linea) return res.status(404).json({ mensaje: 'Producto del pedido no encontrado.' });

    res.status(200).json(linea);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo actualizar el producto del pedido.' });
  }
}

/** Elimina una línea del pedido. */
async function findOneAndDelete(req, res) {
  try {
    const linea = await PedidoProducto.findByIdAndDelete(req.params.id);
    if (!linea) return res.status(404).json({ mensaje: 'Producto del pedido no encontrado.' });

    res.status(200).json({ mensaje: 'Producto eliminado del pedido.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar el producto del pedido.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

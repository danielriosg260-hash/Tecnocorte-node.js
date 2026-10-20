/**
 * API de productos: CRUD del catálogo de la tienda.
 * El borrado se bloquea si el producto ya forma parte de algún pedido.
 */
const Producto = require('../models/producto.model');
const PedidoProducto = require('../models/pedidoproducto.model');

/** Lista todos los productos. */
async function find(req, res) {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });
    res.status(200).json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar los productos.' });
  }
}

/** Busca un producto por su id. */
async function findOne(req, res) {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado.' });

    res.status(200).json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar el producto.' });
  }
}

/** Crea un producto. */
async function insertOne(req, res) {
  try {
    const producto = await Producto.create({
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      precio: Number(req.body.precio),
      categoria: req.body.categoria,
      stock: Number(req.body.stock),
      disponible: req.body.disponible === true || req.body.disponible === 'on',
      imagen: req.body.imagen
    });

    res.status(201).json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos del producto inválidos.' });
  }
}

/** Actualiza un producto. */
async function findOneAndUpdate(req, res) {
  try {
    const campos = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      categoria: req.body.categoria,
      imagen: req.body.imagen
    };

    if (req.body.precio !== undefined) campos.precio = Number(req.body.precio);
    if (req.body.stock !== undefined) campos.stock = Number(req.body.stock);
    if (req.body.disponible !== undefined) {
      campos.disponible = req.body.disponible === true || req.body.disponible === 'on';
    }

    Object.keys(campos).forEach((campo) => campos[campo] === undefined && delete campos[campo]);

    const producto = await Producto.findByIdAndUpdate(req.params.id, campos, { new: true, runValidators: true });
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado.' });

    res.status(200).json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos del producto inválidos.' });
  }
}

/** Elimina un producto que no esté en pedidos. */
async function findOneAndDelete(req, res) {
  try {
    if (await PedidoProducto.exists({ producto: req.params.id })) {
      return res.status(409).json({ mensaje: 'No se puede eliminar un producto incluido en pedidos.' });
    }

    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado.' });

    res.status(200).json({ mensaje: 'Producto eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar el producto.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

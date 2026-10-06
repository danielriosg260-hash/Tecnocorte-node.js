const Producto = require('../models/Producto.model');
const PedidoProducto = require('../models/PedidoProducto.model');

const camposProducto = (body, parcial = false) => {
  const campos = {};
  const incluir = (nombre, valor) => {
    if (!parcial || valor !== undefined) campos[nombre] = valor;
  };

  incluir('nombre', body.nombre);
  incluir('descripcion', body.descripcion);
  if (!parcial || body.precio !== undefined) campos.precio = Number(body.precio);
  incluir('categoria', body.categoria);
  if (!parcial || body.stock !== undefined) campos.stock = Number(body.stock);
  if (!parcial || body.disponible !== undefined) {
    campos.disponible = body.disponible === true || body.disponible === 'true' || body.disponible === 'on';
  }
  return campos;
};

const crear = async (req, res) => {
  try {
    const producto = await Producto.create(camposProducto(req.body));
    res.status(201).json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de producto inválidos' });
  }
};

const listarTodos = async (req, res) => {
  try {
    const productos = await Producto.find();
    res.status(200).json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar los productos' });
  }
};

const listarUno = async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.status(200).json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar el producto' });
  }
};

const actualizar = async (req, res) => {
  try {
    const producto = await Producto.findOneAndUpdate({ _id: req.params.id }, camposProducto(req.body, true), { new: true, runValidators: true });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.status(200).json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de producto inválidos' });
  }
};

const eliminar = async (req, res) => {
  try {
    if (await PedidoProducto.exists({ producto: req.params.id })) return res.status(409).json({ mensaje: 'No se puede eliminar un producto incluido en pedidos' });
    const producto = await Producto.findOneAndDelete({ _id: req.params.id });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar el producto' });
  }
};

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar
};

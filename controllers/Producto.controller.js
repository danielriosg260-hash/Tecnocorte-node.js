const Producto = require('../models/Producto.model');

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

// Controlador de Producto: contiene las funciones que se usan para
// crear, listar, actualizar y eliminar productos en la base de datos.

// Crea un producto nuevo. create() es el equivalente de insertOne en mongoose.
const crear = async (req, res) => {
  try {
    const producto = await Producto.create(camposProducto(req.body));
    res.status(201).json(producto);
  } catch (error) {
    res.status(400).json({ mensaje: 'Datos de producto inválidos' });
  }
};

// Lista todos los productos que hay guardados.
const listarTodos = async (req, res) => {
  try {
    const productos = await Producto.find();
    res.status(200).json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Busca un solo producto por su id. findOne busca el primero que coincida
// con la condición ({ _id: req.params.id }).
const listarUno = async (req, res) => {
  try {
    const producto = await Producto.findOne({ _id: req.params.id });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.status(200).json(producto);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualiza un producto. findOneAndUpdate busca el producto y le aplica
// los cambios que vienen en req.body. { new: true } hace que responda
// con el producto ya actualizado.
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

// Elimina un producto por su id. findOneAndDelete busca el producto y lo elimina.
const eliminar = async (req, res) => {
  try {
    const producto = await Producto.findOneAndDelete({ _id: req.params.id });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
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

/**
 * Vistas de la tienda para el usuario con sesión: listado de productos
 * y ficha de detalle (con redirección si el producto no existe).
 */
const Producto = require('../models/producto.model');
const { aLista, aObjeto } = require('../utils/objetos');

/** Muestra todos los productos de la tienda. */
async function tienda(req, res) {
  const productos = await Producto.find().sort({ createdAt: -1 });

  return res.render('usuarios/usuario_tienda', {
    layout: false,
    active: 'tienda',
    productos: aLista(productos)
  });
}

/** Muestra el detalle de un producto. */
async function detalleProducto(req, res) {
  const producto = await Producto.findById(req.params.id);

  // ID inexistente o borrado: se vuelve a la vitrina sin mostrar error.
  if (!producto) return res.redirect('/tienda');

  return res.render('usuarios/usuario_producto_detalle', {
    title: `${producto.nombre} - TecnoCorte`,
    active: 'tienda',
    producto: aObjeto(producto)
  });
}

module.exports = { detalleProducto, tienda };

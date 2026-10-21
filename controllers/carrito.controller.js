/**
 * Carrito de compras basado en cookie: agregar, actualizar y quitar productos,
 * resumen y confirmación de la compra con descuento de stock en transacción.
 */
const mongoose = require('mongoose');
const Producto = require('../models/producto.model');
const Pedido = require('../models/pedido.model');
const PedidoProducto = require('../models/pedidoproducto.model');
const { guardarCarrito, leerCarrito } = require('../config/session');
const { aObjeto } = require('../utils/objetos');

/**
 * Convierte el carrito de la cookie en una lista con los datos del producto,
 * el subtotal y el total de la compra.
 */
async function armarCarrito(req) {
  const guardado = leerCarrito(req).filter(
    (item) => mongoose.isValidObjectId(item.producto) && Number(item.cantidad) > 0
  );

  if (!guardado.length) return { carrito: [], items: [], cantidad: 0, total: 0 };

  const productos = await Producto.find({ _id: { $in: guardado.map((item) => item.producto) }, disponible: true });
  const porId = new Map(productos.map((producto) => [String(producto._id), producto]));

  const carrito = [];
  const items = [];
  let cantidad = 0;
  let total = 0;

  for (const item of guardado) {
    const producto = porId.get(String(item.producto));
    // Producto borrado o sin stock: se omite del carrito resultante.
    if (!producto) continue;

    // La cantidad se limita a 99 unidades y al stock actual del producto.
    const unidades = Math.min(Number(item.cantidad), 99, producto.stock);
    if (unidades <= 0) continue;

    const subtotal = unidades * producto.precio;
    carrito.push({ producto: String(producto._id), cantidad: unidades });
    items.push({ producto: aObjeto(producto), cantidad: unidades, subtotal });
    cantidad += unidades;
    total += subtotal;
  }

  return { carrito, items, cantidad, total };
}

/** Responde JSON a las peticiones AJAX y redirección al carrito en las normales. */
function responder(req, res, datos) {
  const esAjax = req.get('X-Requested-With') === 'XMLHttpRequest' || req.accepts('json') === 'json';
  if (esAjax) return res.json(datos);
  return res.redirect('/carrito');
}

// ---- Operaciones del carrito ----

/** Muestra el carrito con sus items, cantidad total y precio. */
async function verCarrito(req, res) {
  const datos = await armarCarrito(req);
  guardarCarrito(res, datos.carrito);

  return res.render('carrito/carrito', {
    layout: false,
    items: datos.items,
    cantidad: datos.cantidad,
    total: datos.total
  });
}

/** Agrega una unidad de un producto al carrito (máx. 99 o el stock disponible). */
async function agregar(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Producto inválido.' });
  }

  const producto = await Producto.findOne({
    _id: req.params.id,
    disponible: true,
    stock: { $gt: 0 }
  });

  if (!producto) return res.status(404).json({ error: 'El producto no está disponible.' });

  const datos = await armarCarrito(req);
  const existente = datos.carrito.find((item) => item.producto === String(req.params.id));

  if (existente) {
    existente.cantidad = Math.min(existente.cantidad + 1, producto.stock, 99);
  } else {
    datos.carrito.push({ producto: String(req.params.id), cantidad: 1 });
  }

  guardarCarrito(res, datos.carrito);
  // Se arma una petición simulada con la cookie ya guardada para recalcular total y cantidad.
  const actualizado = await armarCarrito({
    ...req,
    headers: { ...req.headers, cookie: `tc_cart=${encodeURIComponent(JSON.stringify(datos.carrito))}` }
  });

  return responder(req, res, {
    mensaje: 'Producto agregado al carrito.',
    cantidad: actualizado.cantidad,
    total: actualizado.total
  });
}

/** Sube o baja en 1 la cantidad de un producto; si llega a 0 lo quita. */
async function actualizar(req, res) {
  const datos = await armarCarrito(req);
  const item = datos.carrito.find((entrada) => entrada.producto === String(req.params.id));

  if (!item) return responder(req, res, { error: 'El producto no está en el carrito.' });

  item.cantidad += req.body.accion === 'decrementar' ? -1 : 1;
  if (item.cantidad <= 0) datos.carrito.splice(datos.carrito.indexOf(item), 1);

  guardarCarrito(res, datos.carrito);

  // Misma petición simulada que en "agregar" para refrescar totales tras el cambio.
  const actualizado = await armarCarrito({
    ...req,
    headers: { ...req.headers, cookie: `tc_cart=${encodeURIComponent(JSON.stringify(datos.carrito))}` }
  });
  const actual = actualizado.items.find((entrada) => entrada.producto.id === String(req.params.id));

  return responder(req, res, {
    cantidad: actualizado.cantidad,
    total: actualizado.total,
    item_cantidad: actual ? actual.cantidad : 0,
    subtotal: actual ? actual.subtotal : 0,
    empty: actualizado.items.length === 0
  });
}

/** Quita un producto del carrito por completo. */
async function eliminar(req, res) {
  const datos = await armarCarrito(req);
  const carrito = datos.carrito.filter((item) => item.producto !== String(req.params.id));

  guardarCarrito(res, carrito);

  const actualizado = await armarCarrito({
    ...req,
    headers: { ...req.headers, cookie: `tc_cart=${encodeURIComponent(JSON.stringify(carrito))}` }
  });

  return responder(req, res, {
    cantidad: actualizado.cantidad,
    total: actualizado.total,
    item_cantidad: 0,
    empty: actualizado.items.length === 0
  });
}

/** Muestra el resumen de la compra o la confirma. */
async function finalizar(req, res) {
  const datos = await armarCarrito(req);

  if (req.method === 'GET') {
    return res.render('carrito/finalizar_pedido', {
      layout: false,
      items: datos.items,
      cantidad: datos.cantidad,
      total: datos.total
    });
  }

  if (!datos.items.length) return res.redirect('/carrito');

  const sesion = await mongoose.startSession();

  try {
    let pedido;

    // Transacción: o se descuenta stock y se crea el pedido de todos los items,
    // o no se hace nada (si alguno ya no tiene stock suficiente).
    await sesion.withTransaction(async () => {
      for (const item of datos.items) {
        const actualizado = await Producto.findOneAndUpdate(
          { _id: item.producto.id, disponible: true, stock: { $gte: item.cantidad } },
          { $inc: { stock: -item.cantidad } },
          { new: true, session: sesion }
        );

        if (!actualizado) throw new Error('Uno de los productos ya no tiene stock suficiente.');
      }

      [pedido] = await Pedido.create([{ cliente: req.usuario._id, total: datos.total }], { session: sesion });

      await PedidoProducto.insertMany(
        datos.items.map((item) => ({
          pedido: pedido._id,
          producto: item.producto.id,
          cantidad: item.cantidad,
          precio: item.producto.precio
        })),
        { session: sesion }
      );
    });

    guardarCarrito(res, []);
    return res.redirect(`/pedido-exitoso/${pedido._id}`);
  } catch (error) {
    return res.status(409).render('carrito/finalizar_pedido', {
      layout: false,
      items: datos.items,
      cantidad: datos.cantidad,
      total: datos.total,
      error: 'No se pudo completar la compra. Verifica el stock e inténtalo de nuevo.'
    });
  } finally {
    await sesion.endSession();
  }
}

/** Página de éxito tras comprar (solo el dueño del pedido puede verla). */
async function pedidoExitoso(req, res) {
  const pedido = await Pedido.findOne({ _id: req.params.id, cliente: req.usuario._id });

  if (!pedido) return res.redirect('/perfil');

  return res.render('carrito/pedido_exitoso', {
    layout: false,
    pedido: aObjeto(pedido)
  });
}

module.exports = { actualizar, agregar, eliminar, finalizar, pedidoExitoso, verCarrito };

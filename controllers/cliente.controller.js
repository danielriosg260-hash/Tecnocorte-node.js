/**
 * Zona del usuario con sesión: perfil, notificaciones, ajustes de
 * configuración (avisos, privacidad y descarga de datos) y contraseña.
 */
const fs = require('fs');
const path = require('path');
const Usuario = require('../models/usuario.model');
const Reserva = require('../models/reserva.model');
const Pedido = require('../models/pedido.model');
const PedidoProducto = require('../models/pedidoproducto.model');
const Calificacion = require('../models/calificacion.model');
const Notificacion = require('../models/notificacion.model');
const Ingreso = require('../models/ingreso.model');
const { RESENAS_POR_PERSONA, resenasRestantes } = require('../servicios/catalogo');
const { aLista, aObjeto } = require('../utils/objetos');
const { urlSubida } = require('../middleware/subida');

// Pestañas disponibles en la pantalla de configuración.
const PESTANAS = ['perfil', 'seguridad', 'notificaciones', 'privacidad'];

/** Carga los pedidos del cliente con sus productos. */
async function cargarPedidos(clienteId) {
  const pedidos = await Pedido.find({ cliente: clienteId }).sort({ createdAt: -1 });

  return Promise.all(
    pedidos.map(async (pedido) => {
      const lineas = await PedidoProducto.find({ pedido: pedido._id }).populate('producto');

      return {
        ...aObjeto(pedido),
        productos: lineas.map((linea) => ({
          producto: aObjeto(linea.producto),
          cantidad: linea.cantidad,
          precio: linea.precio
        }))
      };
    })
  );
}

/** Perfil del cliente con sus citas, pedidos y calificaciones. */
async function perfil(req, res) {
  const reservas = await Reserva.find({ cliente: req.usuario._id })
    .populate('peluqueria peluquero')
    .sort({ fecha: -1 });

  const citas = reservas.map((reserva) => ({
    ...aObjeto(reserva),
    peluqueria: aObjeto(reserva.peluqueria),
    peluquero: aObjeto(reserva.peluquero) || { nombre: '', apellido: '', activo: false },
    peluqueria_id: String(reserva.peluqueria ? reserva.peluqueria._id : ''),
    peluquero_id: String(reserva.peluquero ? reserva.peluquero._id : '')
  }));

  const calificaciones = await Calificacion.find({ cliente: req.usuario._id }).select('reserva').lean();

  return res.render('usuarios/usuario_perfil', {
    layout: false,
    usuario: aObjeto(req.usuario),
    citas,
    pedidos: await cargarPedidos(req.usuario._id),
    // IDs de las reservas que ya tienen reseña, para no ofrecer repetirla.
    calificaciones_reservas: calificaciones.map((item) => String(item.reserva)),
    resenas_por_persona: RESENAS_POR_PERSONA,
    resenas_restantes: await resenasRestantes(req.usuario._id)
  });
}

/** Actualiza los datos y la foto del perfil. */
async function actualizarPerfil(req, res) {
  const usuario = await Usuario.findById(req.usuario._id);
  if (!usuario) return res.redirect('/login');

  usuario.nombre = String(req.body.nombre || usuario.nombre).trim();
  usuario.apellido = String(req.body.apellido || usuario.apellido).trim();
  usuario.telefono = String(req.body.telefono || '').trim();

  // La foto solo cambia si el formulario trae un archivo nuevo.
  if (req.file) {
    usuario.foto = { url: urlSubida(req.file), public_id: req.file.public_id || req.file.filename };
  }

  await usuario.save();
  // El barbero vuelve a su panel; el cliente, al suyo.
  return res.redirect(req.usuario.rol === 'Barbero' ? '/barbero/perfil' : '/perfil');
}

/** Lista las notificaciones del usuario. */
async function notificaciones(req, res) {
  const lista = await Notificacion.find({ usuario: req.usuario._id })
    .populate('reserva', 'fecha hora servicio estado')
    .sort({ createdAt: -1 })
    .limit(50);

  const notificaciones = lista.map((notificacion) => ({
    ...aObjeto(notificacion),
    reserva: aObjeto(notificacion.reserva)
  }));

  // Cada rol se atiende con su propia vista de notificaciones.
  if (req.usuario.rol === 'Barbero') {
    return res.render('peluqueros/peluquero_notificaciones', {
      layout: 'layouts/dashboard',
      title: 'TecnoCorte - Notificaciones',
      active: 'notificaciones',
      notificaciones
    });
  }

  const calificaciones = await Calificacion.find({ cliente: req.usuario._id }).select('reserva').lean();

  return res.render('usuarios/usuario_notificaciones', {
    layout: false,
    notificaciones,
    calificaciones_reservas: calificaciones.map((item) => String(item.reserva)),
    resenas_restantes: await resenasRestantes(req.usuario._id)
  });
}

/** Marca todas las notificaciones como leídas. */
async function marcarNotificacionesLeidas(req, res) {
  await Notificacion.updateMany({ usuario: req.usuario._id, leida: false }, { $set: { leida: true } });

  return res.redirect(req.usuario.rol === 'Barbero' ? '/barbero/notificaciones' : '/notificaciones');
}

/** Zona de configuración del cliente. */
async function configuracion(req, res) {
  const usuario = await Usuario.findById(req.usuario._id);
  // Si la pestaña pedida no está en la lista, se abre "perfil".
  const pestana = PESTANAS.includes(req.query.seccion) ? req.query.seccion : 'perfil';

  if (req.method === 'POST') {
    const accion = req.body.accion;

    if (accion === 'perfil') {
      usuario.nombre = String(req.body.nombre || usuario.nombre).trim();
      usuario.apellido = String(req.body.apellido || usuario.apellido).trim();
      usuario.telefono = String(req.body.telefono || '').trim();
      if (req.file) usuario.foto = { url: urlSubida(req.file), public_id: req.file.public_id || req.file.filename };
      await usuario.save();
      return res.redirect('/configuracion?seccion=perfil');
    }

    if (accion === 'notificaciones') {
      // Los casilleros HTML llegan como "on" cuando vienen marcados; si no, faltan.
      usuario.aviso_correo = req.body.aviso_correo === 'on';
      usuario.aviso_whatsapp = req.body.aviso_whatsapp === 'on';
      usuario.aviso_sms = req.body.aviso_sms === 'on';
      usuario.aviso_anticipacion_horas = Number(req.body.aviso_anticipacion_horas) || 2;
      await usuario.save();
      return res.redirect('/configuracion?seccion=notificaciones');
    }

    if (accion === 'descarga') {
      // Portabilidad de datos: todo lo guardado del usuario en un JSON descargable.
      const datos = {
        usuario: aObjeto(usuario),
        reservas: aLista(await Reserva.find({ cliente: usuario._id })),
        pedidos: await cargarPedidos(usuario._id)
      };

      res.setHeader('Content-Disposition', 'attachment; filename="mis_datos_tecnocorte.json"');
      return res.json(datos);
    }

    if (accion === 'privacidad') {
      usuario.privacidad_perfil = req.body.privacidad_perfil === 'on';
      await usuario.save();
      return res.redirect('/configuracion?seccion=privacidad');
    }
  }

  // Últimos 5 accesos del usuario, que alimentan la pestaña de seguridad.
  const ingresos = await Ingreso.find({ usuario: usuario._id }).sort({ fecha: -1 }).limit(5).lean();

  return res.render('usuarios/usuario_configuracion', {
    layout: false,
    usuario: aObjeto(usuario),
    pestana,
    pestanas: PESTANAS,
    notificaciones: {
      correo: usuario.aviso_correo,
      whatsapp: usuario.aviso_whatsapp,
      sms: usuario.aviso_sms,
      anticipacion: usuario.aviso_anticipacion_horas
    },
    ingresos
  });
}

/** Cambia la contraseña del usuario con sesión. */
async function cambiarPassword(req, res) {
  const vista = {
    layout: 'layouts/dashboard',
    title: 'Cambiar contraseña - TecnoCorte',
    rol: req.usuario.rol,
    usuario: aObjeto(req.usuario)
  };

  // El GET solo pinta el formulario; el POST aplica el cambio de contraseña.
  if (req.method === 'GET') return res.render('usuarios/cambiar_password', vista);

  const { password_actual, password, password_confirm } = req.body;
  // La contraseña está excluida por defecto en el modelo, por eso se pide con "+".
  const usuario = await Usuario.findById(req.usuario._id).select('+password +tokenVersion');

  const valido = usuario
    && (await usuario.compararPassword(password_actual))
    && password === password_confirm
    && typeof password === 'string'
    && password.length >= 8;

  if (!valido) {
    return res.status(400).render('usuarios/cambiar_password', {
      ...vista,
      error: 'Revisa la contraseña actual y confirma una contraseña nueva de al menos 8 caracteres.'
    });
  }

  usuario.password = password;
  await usuario.save();

  return res.redirect(req.usuario.rol === 'Barbero' ? '/barbero/perfil' : '/perfil');
}

module.exports = {
  actualizarPerfil,
  cambiarPassword,
  cargarPedidos,
  configuracion,
  marcarNotificacionesLeidas,
  notificaciones,
  perfil
};

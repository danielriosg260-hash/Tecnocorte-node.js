const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Usuario = require('../models/usuario.model');
const Peluqueria = require('../models/peluqueria.model');
const Reserva = require('../models/reserva.model');
const Producto = require('../models/producto.model');
const Pedido = require('../models/pedido.model');
const PedidoProducto = require('../models/pedidoproducto.model');
const Horario = require('../models/horario.model');
const Bloqueo = require('../models/bloqueo.model');
const Mensaje = require('../models/mensaje.model');
const Notificacion = require('../models/notificacion.model');
const Calificacion = require('../models/calificacion.model');
const Ingreso = require('../models/ingreso.model');
const ImagenPeluqueria = require('../models/imagengaleria.model');
const Servicio = require('../models/servicio.model');
const SolicitudServicio = require('../models/solicitudservicio.model');
const Configuracion = require('../models/configuracion.model');
const RegistroAccion = require('../models/registroaccion.model');
const RegistroError = require('../models/registroerror.model');
const {
  CATEGORIAS,
  DIAS,
  ESTADOS_RESERVA,
  ROLES,
  TRANSICIONES_PEDIDO,
  TRANSICIONES_RESERVA
} = require('../config/constantes');
const { catalogoServicios, buscarServicioCatalogo } = require('../services/catalogo');
const { inicioDelDia, validarCita } = require('../services/disponibilidad');
const { notificarCuentaCreada, notificarReserva, notificarSuspension } = require('../services/notificaciones');
const { registrarAccion } = require('../services/log');
const { peluqueriaDelBarbero } = require('./barbero.controller');
const { claveFecha, fechaLocal } = require('../utils/fechas');
const { aLista, aObjeto, mensajeError, normalizarEmail } = require('../utils/objetos');

const ESTADOS_PEDIDO = [
  ['Pendiente', 'Pendiente'],
  ['Listo', 'Listo para recoger'],
  ['Entregado', 'Entregado'],
  ['Cancelado', 'Cancelado']
];

const ESTADOS_ERROR = [
  ['pendiente', 'Pendiente'],
  ['revisado', 'Revisado'],
  ['ignorado', 'Ignorado']
];

/** Borra del disco la foto que se reemplaza o se quita. */
function borrarArchivo(url) {
  if (!url || !url.startsWith('/uploads/')) return;

  try {
    const archivo = path.join(__dirname, '..', 'public', url.replace(/^\//, ''));
    if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
  } catch (error) {
    console.error('No se pudo borrar la imagen:', error.message);
  }
}

/** Devuelve el motivo escrito por el admin (obligatorio al borrar fotos). */
function motivoEliminacion(req) {
  return String(req.body.motivo || '').trim();
}

/** Datos comunes del formulario de una cita. */
async function datosFormularioCita() {
  return {
    clientes: aLista(await Usuario.find({ rol: 'Cliente' }).sort({ nombre: 1 })),
    peluqueros: aLista(await Usuario.find({ rol: 'Barbero', activo: { $ne: false } }).sort({ nombre: 1 })),
    peluquerias: aLista(await Peluqueria.find().sort({ nombre: 1 })),
    servicios: await catalogoServicios(),
    reserva_estados: ESTADOS_RESERVA
  };
}

/** Genera un reporte HTML que Excel abre como hoja de cálculo. */
function respuestaExcel(res, titulo, subtitulo, encabezados, filas, nombreArchivo) {
  const escapar = (valor) => String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const cabecera = encabezados.map((item) => `<th>${escapar(item)}</th>`).join('');
  const cuerpo = filas.length
    ? filas.map((fila) => `<tr>${fila.map((valor) => `<td>${escapar(valor)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${encabezados.length}" class="empty">No hay registros para mostrar</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;color:#27231b;background:#fff;padding:24px}
    .report{max-width:1400px;margin:auto}
    h1{margin:0;color:#6f520d;font-size:24px}.subtitle{color:#777;margin:6px 0 20px;font-size:13px}
    .meta{background:#f6edcf;border:1px solid #d6ad42;padding:10px 14px;margin-bottom:18px;font-size:12px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th{background:#6f520d;color:#fff;padding:11px 9px;text-align:left;white-space:nowrap}
    td{border:1px solid #ded8c9;padding:9px;background:#fff}tr:nth-child(even) td{background:#faf7ef}
    .empty{text-align:center;color:#777;padding:22px}
  </style></head><body><div class="report"><h1>${escapar(titulo)}</h1><p class="subtitle">${escapar(subtitulo)}</p>
  <div class="meta">Generado por TecnoCorte · Registros: <strong>${filas.length}</strong></div>
  <table><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div></body></html>`;

  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  return res.send('\ufeff' + html);
}

/** Panel principal del administrador. */
async function dashboard(req, res) {
  const [reservas, catalogo, pedidos, totalClientes, citasHoy, pedidosPendientes] = await Promise.all([
    Reserva.find().populate('cliente', 'nombre apellido').populate('peluquero', 'nombre apellido'),
    catalogoServicios(),
    Pedido.find({ pago_confirmado: true, estado: { $ne: 'Cancelado' } }).select('total'),
    Usuario.countDocuments({ rol: 'Cliente' }),
    Reserva.countDocuments({ fecha: inicioDelDia() }),
    Pedido.countDocuments({ estado: 'Pendiente' })
  ]);

  const precios = new Map(catalogo.map((servicio) => [servicio.nombre, servicio.precio]));
  const estados = {};
  ESTADOS_RESERVA.forEach(([estado]) => {
    estados[estado] = reservas.filter((reserva) => reserva.estado === estado).length;
  });

  const ventasServicios = reservas
    .filter((reserva) => reserva.estado === 'Completada')
    .reduce((total, reserva) => total + (precios.get(reserva.servicio) || 0), 0);
  const ventasProductos = pedidos.reduce((total, pedido) => total + (Number(pedido.total) || 0), 0);
  const ultimas = [...reservas]
    .sort((a, b) => `${claveFecha(b.fecha)} ${b.hora}`.localeCompare(`${claveFecha(a.fecha)} ${a.hora}`))
    .slice(0, 6);

  return res.render('administrador/admin_dashboard', {
    layout: 'layouts/dashboard',
    total: ventasServicios + ventasProductos,
    ventas_servicios: ventasServicios,
    ventas_productos: ventasProductos,
    total_reservas: reservas.length,
    total_clientes: totalClientes,
    citas_hoy: citasHoy,
    pedidos_pendientes: pedidosPendientes,
    estados,
    maximo: Math.max(1, ...Object.values(estados)),
    ultimas_reservas: aLista(ultimas)
  });
}

/** Descarga el reporte de reservas. */
async function exportarReservas(req, res) {
  const reservas = await Reserva.find()
    .populate('cliente', 'nombre apellido')
    .populate('peluquero', 'nombre apellido')
    .populate('peluqueria', 'nombre')
    .sort({ fecha: 1, hora: 1 });

  const filas = reservas.map((reserva) => [
    reserva._id,
    claveFecha(reserva.fecha).split('-').reverse().join('/'),
    reserva.hora,
    `${reserva.cliente ? reserva.cliente.nombre : ''} ${reserva.cliente ? reserva.cliente.apellido : ''}`,
    `${reserva.peluquero ? reserva.peluquero.nombre : ''} ${reserva.peluquero ? reserva.peluquero.apellido : ''}`,
    reserva.peluqueria ? reserva.peluqueria.nombre : '',
    reserva.servicio,
    reserva.estado
  ]);

  return respuestaExcel(
    res,
    'Reporte de reservas · TecnoCorte',
    'Reservas registradas',
    ['ID', 'Fecha', 'Hora', 'Cliente', 'Barbero', 'Barbería', 'Servicio', 'Estado'],
    filas,
    'reservas_tecnocorte.xls'
  );
}

/** Descarga el reporte de pedidos. */
async function exportarPedidos(req, res) {
  const pedidos = await Pedido.find().populate('cliente', 'nombre apellido email').sort({ fecha: -1 });

  const filas = pedidos.map((pedido) => [
    pedido._id,
    new Date(pedido.fecha).toLocaleString('es-CO'),
    `${pedido.cliente ? pedido.cliente.nombre : ''} ${pedido.cliente ? pedido.cliente.apellido : ''}`,
    pedido.cliente ? pedido.cliente.email : '',
    pedido.total,
    pedido.estado,
    pedido.pago_confirmado ? 'Sí' : 'No'
  ]);

  return respuestaExcel(
    res,
    'Reporte de pedidos · TecnoCorte',
    'Pedidos registrados',
    ['ID', 'Fecha', 'Cliente', 'Correo', 'Total COP', 'Estado', 'Pago confirmado'],
    filas,
    'pedidos_tecnocorte.xls'
  );
}

/** Listado de usuarios con el resumen por rol. */
async function usuarios(req, res) {
  const [lista, totalAdmin, totalClientes, totalPeluqueros] = await Promise.all([
    Usuario.find().sort({ createdAt: -1 }),
    Usuario.countDocuments({ rol: 'Admin' }),
    Usuario.countDocuments({ rol: 'Cliente' }),
    Usuario.countDocuments({ rol: 'Barbero' })
  ]);

  return res.render('administrador/admin_usuarios', {
    layout: 'layouts/dashboard',
    title: 'Gestión de Usuarios - TecnoCorte',
    usuarios: aLista(lista),
    total_usuarios: lista.length,
    total_admin: totalAdmin,
    total_clientes: totalClientes,
    total_peluqueros: totalPeluqueros
  });
}

/** Formulario para crear o editar un usuario. */
async function formularioUsuario(req, res, error = '') {
  const usuario = mongoose.isValidObjectId(req.params.id)
    ? aObjeto(await Usuario.findById(req.params.id))
    : null;

  return res.render('administrador/admin_formulario_usuario', {
    layout: 'layouts/dashboard',
    title: usuario ? 'Editar Usuario - TecnoCorte' : 'Crear Usuario - TecnoCorte',
    // Al crear se manda un objeto vacío para que la plantilla no falle.
    usuario: usuario || {},
    editar: Boolean(usuario),
    roles: ROLES,
    peluquerias: aLista(await Peluqueria.find().sort({ nombre: 1 })),
    error
  });
}

/** Guarda un usuario nuevo o los cambios de uno existente. */
async function guardarUsuario(req, res) {
  const editando = mongoose.isValidObjectId(req.params.id);

  if (!editando) {
    const campos = ['nombre', 'apellido', 'email', 'password', 'rol'];

    if (campos.some((campo) => !String(req.body[campo] || '').trim()) || !ROLES.some(([rol]) => rol === req.body.rol)) {
      return formularioUsuario(req, res, 'Todos los campos son obligatorios.');
    }

    if (req.body.rol === 'Barbero' && !mongoose.isValidObjectId(req.body.peluqueria)) {
      return formularioUsuario(req, res, 'Para crear un barbero debes seleccionar la barbería a la que pertenece.');
    }
  }

  try {
    const usuario = editando
      ? await Usuario.findById(req.params.id).select('+password +tokenVersion')
      : new Usuario();

    if (!usuario) return res.redirect('/admin/usuarios');

    usuario.nombre = String(req.body.nombre || usuario.nombre).trim();
    usuario.apellido = String(req.body.apellido || usuario.apellido).trim();
    usuario.email = normalizarEmail(req.body.email || usuario.email);
    usuario.telefono = String(req.body.telefono || '').trim();

    if (!editando || usuario.rol !== 'Admin') {
      usuario.rol = ROLES.some(([rol]) => rol === req.body.rol) ? req.body.rol : usuario.rol;
    }

    usuario.peluqueria_id = usuario.rol === 'Barbero' && mongoose.isValidObjectId(req.body.peluqueria)
      ? req.body.peluqueria
      : undefined;

    if (req.body.password) usuario.password = req.body.password;
    if (req.file) usuario.foto = { url: `/uploads/${req.file.filename}`, public_id: req.file.filename };
    if (req.body.quitar_foto && usuario.foto && usuario.foto.url) {
      borrarArchivo(usuario.foto.url);
      usuario.foto = { url: '', public_id: '' };
    }

    await usuario.save();
    if (!editando) void notificarCuentaCreada(usuario);

    return res.redirect('/admin/usuarios');
  } catch (error) {
    return formularioUsuario(req, res, mensajeError(error));
  }
}

/** Elimina un usuario (no permite borrarse a sí mismo). */
async function eliminarUsuario(req, res) {
  if (String(req.params.id) !== String(req.usuario._id) && mongoose.isValidObjectId(req.params.id)) {
    const usuario = await Usuario.findById(req.params.id);

    if (usuario) {
      const tieneHistorial = await Promise.all([
        Reserva.exists({ $or: [{ cliente: usuario._id }, { peluquero: usuario._id }] }),
        Pedido.exists({ cliente: usuario._id })
      ]);

      if (tieneHistorial.some(Boolean)) {
        return res.redirect('/admin/usuarios?error=historial');
      }

      if (usuario.foto && usuario.foto.url) borrarArchivo(usuario.foto.url);

      // Las reseñas y notificaciones del usuario se borran con él, igual que
      // en la base de datos relacional original.
      await Calificacion.deleteMany({ $or: [{ cliente: usuario._id }, { peluquero: usuario._id }] });
      await Notificacion.deleteMany({ usuario: usuario._id });

      await usuario.deleteOne();
      await registrarAccion(req, 'eliminar_usuario', 'Usuario', usuario._id, `${usuario.nombre} ${usuario.apellido}`);
    }
  }

  return res.redirect('/admin/usuarios');
}

/** Suspende o reactiva un usuario. */
async function suspenderUsuario(req, res) {
  const usuario = await Usuario.findById(req.params.id);

  if (usuario && usuario.rol !== 'Admin') {
    usuario.activo = !usuario.activo;
    await usuario.save();

    if (usuario.rol === 'Barbero' && !usuario.activo) {
      const futuras = await Reserva.find({
        peluquero: usuario._id,
        fecha: { $gte: inicioDelDia() },
        estado: { $in: ['Pendiente', 'Confirmada', 'Reprogramar'] }
      }).select('_id');

      await Reserva.updateMany(
        { _id: { $in: futuras.map((item) => item._id) } },
        {
          requiere_reprogramacion: true,
          motivo_reprogramacion: 'El barbero fue suspendido. Selecciona otro barbero.'
        }
      );

      futuras.forEach((reserva) => void notificarSuspension(reserva._id));
    }
  }

  return res.redirect(req.body.origen === 'peluqueros' ? '/admin/peluqueros' : '/admin/usuarios');
}

/** Quita la foto de perfil de un usuario con un motivo. */
async function quitarFotoUsuario(req, res) {
  const usuario = await Usuario.findById(req.params.id);
  const motivo = motivoEliminacion(req);
  const destino = req.body.origen === 'peluqueros' ? '/admin/peluqueros' : '/admin/usuarios';

  if (usuario && motivo && usuario.foto && usuario.foto.url) {
    borrarArchivo(usuario.foto.url);
    usuario.foto = { url: '', public_id: '' };
    await usuario.save();
  }

  return res.redirect(destino);
}

/** Listado de barberos. */
async function peluqueros(req, res) {
  return res.render('administrador/admin_listar_peluqueros', {
    layout: 'layouts/dashboard',
    title: 'Gestión de Barberos - TecnoCorte',
    datos: aLista(await Usuario.find({ rol: 'Barbero' }).sort({ nombre: 1 }))
  });
}

/** Formulario para crear o editar un barbero. */
async function formularioPeluquero(req, res, error = '') {
  const datos = mongoose.isValidObjectId(req.params.id)
    ? aObjeto(await Usuario.findById(req.params.id))
    : null;

  return res.render('administrador/admin_formulario_peluquero', {
    layout: 'layouts/dashboard',
    title: datos ? 'Editar Peluquero - TecnoCorte' : 'Crear Peluquero - TecnoCorte',
    // Al crear se manda un objeto vacío para que la plantilla no falle.
    datos: datos || {},
    editar: Boolean(datos),
    peluquerias: aLista(await Peluqueria.find().sort({ nombre: 1 })),
    error
  });
}

/** Guarda un barbero nuevo o sus cambios. */
async function guardarPeluquero(req, res) {
  const editando = mongoose.isValidObjectId(req.params.id);

  try {
    const barbero = editando
      ? await Usuario.findOne({ _id: req.params.id, rol: 'Barbero' }).select('+password +tokenVersion')
      : new Usuario({ rol: 'Barbero' });

    if (!barbero) return res.redirect('/admin/peluqueros');

    barbero.nombre = String(req.body.nombre || '').trim();
    barbero.apellido = String(req.body.apellido || '').trim();
    barbero.email = normalizarEmail(req.body.email);
    barbero.telefono = String(req.body.telefono || '').trim();
    barbero.peluqueria_id = mongoose.isValidObjectId(req.body.peluqueria) ? req.body.peluqueria : undefined;

    if (!editando && !mongoose.isValidObjectId(req.body.peluqueria)) {
      return formularioPeluquero(req, res, 'Selecciona la barbería a la que pertenece el barbero.');
    }

    if (req.body.password) barbero.password = req.body.password;
    if (req.file) barbero.foto = { url: `/uploads/${req.file.filename}`, public_id: req.file.filename };
    if (req.body.quitar_foto && barbero.foto && barbero.foto.url) {
      borrarArchivo(barbero.foto.url);
      barbero.foto = { url: '', public_id: '' };
    }

    await barbero.save();
    if (!editando) void notificarCuentaCreada(barbero);

    return res.redirect('/admin/peluqueros');
  } catch (error) {
    return formularioPeluquero(req, res, mensajeError(error));
  }
}

/** Suspende el barbero y libera sus citas futuras. */
async function eliminarPeluquero(req, res) {
  const barbero = await Usuario.findOne({ _id: req.params.id, rol: 'Barbero' });

  if (barbero) {
    barbero.activo = false;
    await barbero.save();
    await suspenderCitasDelBarbero(barbero._id);
  }

  return res.redirect('/admin/peluqueros');
}

/** Marca para reprogramar las citas futuras de un barbero suspendido. */
async function suspenderCitasDelBarbero(barberoId) {
  const futuras = await Reserva.find({
    peluquero: barberoId,
    fecha: { $gte: inicioDelDia() },
    estado: { $in: ['Pendiente', 'Confirmada', 'Reprogramar'] }
  }).select('_id');

  await Reserva.updateMany(
    { _id: { $in: futuras.map((item) => item._id) } },
    {
      requiere_reprogramacion: true,
      motivo_reprogramacion: 'El barbero fue suspendido. Selecciona otro barbero.'
    }
  );

  futuras.forEach((reserva) => void notificarSuspension(reserva._id));
}

/** Listado de citas con filtros por fecha y estado. */
async function reservas(req, res) {
  const filtro = {};
  const estado = ESTADOS_RESERVA.some(([valor]) => valor === req.query.estado) ? req.query.estado : '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha || '')) {
    filtro.fecha = new Date(`${req.query.fecha}T00:00:00`);
  }

  if (estado) filtro.estado = estado;

  const datos = await Reserva.find(filtro)
    .populate('cliente', 'nombre apellido')
    .populate('peluquero', 'nombre apellido')
    .populate('peluqueria', 'nombre')
    .sort({ fecha: 1, hora: 1 });

  // Agrupación por estado para los contadores de la cabecera.
  const grupos = new Map();
  datos.forEach((reserva) => {
    if (!grupos.has(reserva.estado)) grupos.set(reserva.estado, []);
    grupos.get(reserva.estado).push(reserva);
  });

  return res.render('administrador/admin_listar_reservas', {
    layout: 'layouts/dashboard',
    title: 'Gestión de Reservas - TecnoCorte',
    datos: aLista(datos),
    estado_list: [...grupos.entries()].map(([grouper, list]) => ({ grouper, list })),
    filtro_fecha: req.query.fecha || '',
    filtro_estado: estado,
    reserva_estados: ESTADOS_RESERVA
  });
}

/** Formulario de una cita nueva o existente. */
async function formularioReserva(req, res, error = '') {
  const reserva = mongoose.isValidObjectId(req.params.id)
    ? await Reserva.findById(req.params.id).populate('cliente peluquero peluqueria')
    : null;

  const datos = reserva
    ? {
        ...aObjeto(reserva),
        cliente_id: String(reserva.cliente ? reserva.cliente._id : ''),
        peluqueria_id: String(reserva.peluqueria ? reserva.peluqueria._id : ''),
        peluquero_id: String(reserva.peluquero ? reserva.peluquero._id : '')
      }
    : {};

  return res.render('administrador/admin_formulario_reserva', {
    layout: 'layouts/dashboard',
    title: reserva ? 'Editar Reserva - TecnoCorte' : 'Crear Reserva - TecnoCorte',
    datos,
    editar: Boolean(reserva),
    ...(await datosFormularioCita()),
    error
  });
}

/** Guarda una cita creada o editada desde el panel. */
async function guardarReserva(req, res) {
  const editar = mongoose.isValidObjectId(req.params.id);
  const servicio = await buscarServicioCatalogo(req.body.servicio);

  if (
    !servicio ||
    !mongoose.isValidObjectId(req.body.cliente) ||
    !mongoose.isValidObjectId(req.body.peluquero) ||
    !mongoose.isValidObjectId(req.body.peluqueria)
  ) {
    return formularioReserva(req, res, 'Completa todos los datos de la cita.');
  }

  const error = await validarCita(
    { Usuario, Horario, Bloqueo, Reserva },
    {
      peluqueria: req.body.peluqueria,
      peluquero: req.body.peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      minutos: servicio.minutos,
      excluir: editar ? req.params.id : undefined
    }
  );

  if (error) return formularioReserva(req, res, error);

  const valores = {
    cliente: req.body.cliente,
    peluqueria: req.body.peluqueria,
    peluquero: req.body.peluquero,
    servicio: servicio.nombre,
    minutos: servicio.minutos,
    fecha: new Date(`${req.body.fecha}T00:00:00`),
    hora: req.body.hora,
    estado: req.body.estado || 'Pendiente'
  };

  try {
    let reserva;

    if (editar) {
      const anterior = await Reserva.findById(req.params.id);
      if (!anterior) return res.redirect('/admin/reservas');

      const destino = TRANSICIONES_RESERVA[anterior.estado] || [];
      if (!destino.includes(valores.estado)) {
        return formularioReserva(req, res, 'Ese cambio de estado no está permitido.');
      }

      reserva = await Reserva.findByIdAndUpdate(req.params.id, valores, { new: true, runValidators: true });
      await registrarAccion(req, 'actualizar_cita', 'Reserva', reserva._id, `Estado: ${anterior.estado} a ${valores.estado}`);
    } else {
      reserva = await Reserva.create(valores);
      await registrarAccion(req, 'crear_cita', 'Reserva', reserva._id, `Cita de ${reserva.servicio}`);
    }

    void notificarReserva(reserva._id, editar ? 'modificada' : 'reservada');
    return res.redirect('/admin/reservas');
  } catch (creationError) {
    const mensaje = creationError.code === 11000
      ? 'Ese horario ya está ocupado.'
      : 'No se pudo guardar la cita.';

    return formularioReserva(req, res, mensaje);
  }
}

/** Elimina una cita del sistema. */
async function eliminarReserva(req, res) {
  const reserva = await Reserva.findByIdAndDelete(req.params.id);
  if (reserva) await registrarAccion(req, 'eliminar_cita', 'Reserva', reserva._id, reserva.servicio);

  return res.redirect('/admin/reservas');
}

/** Cancela una cita sin borrarla. */
async function cancelarReserva(req, res) {
  const reserva = await Reserva.findByIdAndUpdate(req.params.id, { estado: 'Cancelada' }, { new: true });

  if (reserva) {
    await registrarAccion(req, 'cancelar_cita', 'Reserva', reserva._id, 'Cancelada por el administrador');
    void notificarReserva(reserva._id, 'cancelada');
  }

  return res.redirect('/admin/reservas');
}

/** Listado de barberías. */
async function peluquerias(req, res) {
  return res.render('administrador/admin_peluquerias', {
    layout: 'layouts/dashboard',
    peluquerias: aLista(await Peluqueria.find().sort({ nombre: 1 }))
  });
}

/** Formulario para crear o editar una barbería. */
async function formularioPeluqueria(req, res, error = '') {
  const peluqueria = mongoose.isValidObjectId(req.params.id)
    ? aObjeto(await Peluqueria.findById(req.params.id))
    : null;

  return res.render('administrador/admin_formulario_peluqueria', {
    layout: 'layouts/dashboard',
    title: peluqueria ? 'Editar Barbería - TecnoCorte' : 'Crear Barbería - TecnoCorte',
    // Al crear se manda un objeto vacío para que la plantilla no falle.
    peluqueria: peluqueria || {},
    editar: Boolean(peluqueria),
    barberos: aLista(await Usuario.find({ rol: 'Barbero' }).sort({ nombre: 1 })),
    error
  });
}

/** Guarda una barbería y su dueño. */
async function guardarPeluqueria(req, res) {
  try {
    const peluqueria = mongoose.isValidObjectId(req.params.id)
      ? await Peluqueria.findById(req.params.id)
      : new Peluqueria();

    if (!peluqueria) return res.redirect('/admin/peluquerias');

    peluqueria.nombre = String(req.body.nombre || '').trim();
    peluqueria.ubicacion = String(req.body.ubicacion || '').trim();
    peluqueria.telefono = String(req.body.telefono || '').trim();
    peluqueria.descripcion = String(req.body.descripcion || '').trim().slice(0, 2000);
    peluqueria.dueno = mongoose.isValidObjectId(req.body.dueno) ? req.body.dueno : null;

    if (req.file) {
      if (peluqueria.imagen) borrarArchivo(peluqueria.imagen);
      peluqueria.imagen = `/uploads/${req.file.filename}`;
    }

    await peluqueria.save();
    return res.redirect('/admin/peluquerias');
  } catch (error) {
    return formularioPeluqueria(req, res, mensajeError(error));
  }
}

/** Elimina una barbería que no tenga citas. */
async function eliminarPeluqueria(req, res) {
  if (mongoose.isValidObjectId(req.params.id)) {
    const tieneCitas = await Reserva.exists({ peluqueria: req.params.id });

    if (!tieneCitas) {
      const peluqueria = await Peluqueria.findByIdAndDelete(req.params.id);
      if (peluqueria && peluqueria.imagen) borrarArchivo(peluqueria.imagen);
    }
  }

  return res.redirect('/admin/peluquerias');
}

/** Quita la foto principal de una barbería. */
async function quitarFotoPeluqueria(req, res) {
  const peluqueria = await Peluqueria.findById(req.params.id);

  if (peluqueria && motivoEliminacion(req) && peluqueria.imagen) {
    borrarArchivo(peluqueria.imagen);
    peluqueria.imagen = '';
    await peluqueria.save();
  }

  return res.redirect('/admin/peluquerias');
}

/** Listado de productos. */
async function productos(req, res) {
  return res.render('administrador/admin_productos', {
    layout: 'layouts/dashboard',
    productos: aLista(await Producto.find().sort({ nombre: 1 }))
  });
}

/** Formulario para crear o editar un producto. */
async function formularioProducto(req, res, error = '') {
  const producto = mongoose.isValidObjectId(req.params.id)
    ? aObjeto(await Producto.findById(req.params.id))
    : null;

  return res.render('administrador/admin_formulario_producto', {
    layout: 'layouts/dashboard',
    title: producto ? 'Editar Producto - TecnoCorte' : 'Crear Producto - TecnoCorte',
    // Al crear se manda un producto vacío pero disponible.
    producto: producto || { disponible: true },
    editar: Boolean(producto),
    categorias: CATEGORIAS,
    error
  });
}

/** Guarda un producto. */
async function guardarProducto(req, res) {
  try {
    const producto = mongoose.isValidObjectId(req.params.id)
      ? await Producto.findById(req.params.id)
      : new Producto();

    if (!producto) return res.redirect('/admin/productos');

    const stockAnterior = producto.stock || 0;
    const precio = Number(req.body.precio);
    const stock = Number(req.body.stock);

    if (!String(req.body.nombre || '').trim()) return formularioProducto(req, res, 'El nombre del producto es obligatorio.');
    if (!Number.isFinite(precio) || !Number.isFinite(stock) || precio < 0 || stock < 0) {
      return formularioProducto(req, res, 'El precio y el stock deben ser números positivos.');
    }

    producto.nombre = String(req.body.nombre).trim();
    producto.descripcion = String(req.body.descripcion || '');
    producto.precio = precio;
    producto.stock = stock;
    producto.categoria = CATEGORIAS.some(([valor]) => valor === req.body.categoria) ? req.body.categoria : CATEGORIAS[0][0];
    producto.disponible = req.body.disponible === 'on' && producto.stock > 0;

    if (req.body.quitar_imagen && producto.imagen) {
      borrarArchivo(producto.imagen);
      producto.imagen = '';
    }

    if (req.file) {
      if (producto.imagen) borrarArchivo(producto.imagen);
      producto.imagen = `/uploads/${req.file.filename}`;
    }

    await producto.save();

    if (stockAnterior > 0 && producto.stock === 0) {
      const administradores = await Usuario.find({ rol: 'Admin', activo: { $ne: false } }).select('_id');

      if (administradores.length) {
        await Notificacion.insertMany(
          administradores.map((admin) => ({
            usuario: admin._id,
            tipo: 'sistema',
            titulo: 'Stock agotado',
            mensaje: `Stock agotado: ${producto.nombre}.`
          }))
        );
      }
    }

    return res.redirect('/admin/productos');
  } catch (error) {
    return formularioProducto(req, res, mensajeError(error));
  }
}

/** Retira un producto de la tienda sin borrar su historial. */
async function eliminarProducto(req, res) {
  await Producto.findByIdAndUpdate(req.params.id, { stock: 0, disponible: false });

  return res.redirect('/admin/productos');
}

/** Quita la foto de un producto. */
async function quitarImagenProducto(req, res) {
  const producto = await Producto.findById(req.params.id);

  if (producto && motivoEliminacion(req) && producto.imagen) {
    borrarArchivo(producto.imagen);
    producto.imagen = '';
    await producto.save();
  }

  return res.redirect('/admin/productos');
}

/** Horarios y bloqueos por barbería. */
async function horarios(req, res) {
  const lista = aLista(await Peluqueria.find().sort({ nombre: 1 }));
  const actual = lista.find((item) => item.id === req.query.peluqueria) || lista[0] || null;

  if (actual) {
    const guardados = await Horario.find({ peluqueria: actual.id }).select('dia_semana');
    const faltantes = [0, 1, 2, 3, 4, 5, 6].filter(
      (dia) => !guardados.some((item) => item.dia_semana === dia)
    );

    if (faltantes.length) {
      await Horario.insertMany(
        faltantes.map((dia) => ({
          peluqueria: actual.id,
          dia_semana: dia,
          activo: dia < 6,
          hora_inicio: '09:00',
          hora_fin: '18:00'
        }))
      );
    }
  }

  if (req.method === 'POST') {
    if (req.body.accion === 'guardar_horarios' && actual) {
      for (let dia = 0; dia <= 6; dia++) {
        const inicio = req.body[`inicio_${dia}`] || '09:00';
        const fin = req.body[`fin_${dia}`] || '18:00';

        await Horario.findOneAndUpdate(
          { peluqueria: actual.id, dia_semana: dia },
          {
            activo: req.body[`activo_${dia}`] === 'on',
            hora_inicio: /^\d{2}:\d{2}$/.test(inicio) ? inicio : '09:00',
            hora_fin: /^\d{2}:\d{2}$/.test(fin) ? fin : '18:00'
          },
          { upsert: true, runValidators: true }
        );
      }
    }

    if (req.body.accion === 'crear_bloqueo' && actual && /^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha || '')) {
      await Bloqueo.create({
        peluqueria: actual.id,
        fecha: new Date(`${req.body.fecha}T00:00:00`),
        hora: /^\d{2}:\d{2}$/.test(req.body.hora || '') ? req.body.hora : null,
        motivo: String(req.body.motivo || '').slice(0, 200)
      });
    }

    return res.redirect(`/admin/horarios?peluqueria=${actual ? actual.id : ''}`);
  }

  const [guardados, bloqueos] = actual
    ? await Promise.all([
        Horario.find({ peluqueria: actual.id }),
        Bloqueo.find({ peluqueria: actual.id }).sort({ fecha: 1 })
      ])
    : [[], []];

  const horariosVista = [0, 1, 2, 3, 4, 5, 6].map((dia) => {
    const guardado = guardados.find((item) => item.dia_semana === dia);

    return {
      dia_semana: dia,
      dia_semana_display: DIAS[dia],
      activo: guardado ? guardado.activo : dia < 6,
      hora_inicio: guardado ? guardado.hora_inicio : '09:00',
      hora_fin: guardado ? guardado.hora_fin : '18:00'
    };
  });

  return res.render('administrador/admin_horarios', {
    layout: 'layouts/dashboard',
    title: 'Horarios y bloqueos - TecnoCorte',
    peluquerias: lista,
    peluqueria_actual: actual,
    horarios: horariosVista,
    bloqueos: aLista(bloqueos),
    hoy: claveFecha(new Date()),
    error: req.query.error || ''
  });
}

/** Elimina un bloqueo de horario. */
async function eliminarBloqueo(req, res) {
  await Bloqueo.findByIdAndDelete(req.params.id);

  return res.redirect('/admin/horarios');
}

/** Bandeja de mensajes de contacto. */
async function mensajes(req, res) {
  const lista = await Mensaje.find().sort({ createdAt: -1 });
  await Mensaje.updateMany({ leido: false }, { leido: true });

  return res.render('administrador/admin_mensajes', {
    layout: 'layouts/dashboard',
    mensajes: aLista(lista)
  });
}

/** Historial de ingresos al sitio. */
async function ingresos(req, res) {
  const filtro = ['Cliente', 'Barbero', 'Admin'].includes(req.query.rol) ? { rol: req.query.rol } : {};
  const lista = await Ingreso.find(filtro).populate('usuario', 'nombre apellido email').sort({ fecha: -1 });

  return res.render('administrador/admin_listar_ingresos', {
    layout: 'layouts/dashboard',
    title: 'Registro de Ingresos - TecnoCorte',
    ingresos: aLista(lista.filter((item) => item.usuario)).map((item) => ({ ...item, rol: item.rol })),
    rol_filtro: req.query.rol || ''
  });
}

/** Pedidos de la tienda con su estado y pago. */
async function pedidos(req, res) {
  const lista = await Pedido.find().populate('cliente', 'nombre apellido email').sort({ fecha: -1 }).limit(200);

  const datos = await Promise.all(
    lista.map(async (pedido) => ({
      ...aObjeto(pedido),
      productos: aLista(await PedidoProducto.find({ pedido: pedido._id }).populate('producto'))
    }))
  );

  return res.render('administrador/admin_pedidos', {
    layout: 'layouts/dashboard',
    title: 'Pedidos - TecnoCorte',
    pedidos: datos,
    estados_pedido: ESTADOS_PEDIDO,
    error: req.query.error || ''
  });
}

/** Cambia el estado y el pago de un pedido. */
async function actualizarPedido(req, res) {
  const pedido = await Pedido.findById(req.params.id).populate('cliente', 'nombre apellido email');
  if (!pedido) return res.redirect('/admin/pedidos');

  const permitidos = TRANSICIONES_PEDIDO[pedido.estado] || [];
  if (!permitidos.includes(req.body.estado)) {
    return res.redirect('/admin/pedidos?error=transicion');
  }

  pedido.estado = req.body.estado;
  pedido.pago_confirmado = req.body.pago_confirmado === 'on';
  pedido.fecha_pago = pedido.pago_confirmado ? (pedido.fecha_pago || new Date()) : null;
  pedido.fecha_entrega = pedido.estado === 'Entregado' ? (pedido.fecha_entrega || new Date()) : null;
  await pedido.save();

  await registrarAccion(req, 'actualizar_pedido', 'Pedido', pedido._id, `Estado: ${pedido.estado}`);

  if (pedido.cliente) {
    await Notificacion.create({
      usuario: pedido.cliente._id,
      tipo: 'sistema',
      titulo: `Pedido #${pedido._id}`,
      mensaje: `Tu pedido está: ${pedido.estado}. ${pedido.pago_confirmado ? 'Pago confirmado en tienda.' : 'Pago pendiente en tienda.'}`
    });
  }

  return res.redirect('/admin/pedidos');
}

/** Galería de todas las barberías para moderar fotos. */
async function galeria(req, res) {
  const fotos = await ImagenPeluqueria.find().populate('peluqueria', 'nombre dueno').sort({ createdAt: -1 });
  const conFotos = [...new Set(fotos.filter((foto) => foto.peluqueria).map((foto) => String(foto.peluqueria._id)))];

  const peluquerias = (await Peluqueria.find({ _id: { $in: conFotos } }).sort({ nombre: 1 })).map((peluqueria) => ({
    ...aObjeto(peluqueria),
    cantidad_fotos: fotos.filter((foto) => foto.peluqueria && String(foto.peluqueria._id) === String(peluqueria._id)).length
  }));

  return res.render('administrador/admin_galeria', {
    layout: 'layouts/dashboard',
    title: 'Galería - TecnoCorte',
    fotos: aLista(fotos),
    peluquerias,
    error: req.query.error || ''
  });
}

/** Elimina una foto de galería con un motivo. */
async function eliminarImagenGaleria(req, res) {
  const foto = await ImagenPeluqueria.findById(req.params.id).populate('peluqueria', 'nombre');

  if (foto && motivoEliminacion(req)) {
    borrarArchivo(foto.url);
    await foto.deleteOne();
  }

  return res.redirect('/admin/galeria');
}

/** Historial de acciones del panel. */
async function acciones(req, res) {
  const lista = await RegistroAccion.find().populate('actor', 'nombre apellido rol').sort({ createdAt: -1 }).limit(300);

  return res.render('administrador/admin_acciones', {
    layout: 'layouts/dashboard',
    title: 'Historial de acciones - TecnoCorte',
    acciones: aLista(lista)
  });
}

/** Errores registrados en el sitio. */
async function errores(req, res) {
  if (req.method === 'POST') {
    if (req.body.accion === 'revisar_todos') {
      await RegistroError.updateMany({ estado: 'pendiente' }, { estado: 'revisado' });
    } else if (ESTADOS_ERROR.some(([valor]) => valor === req.body.estado) && mongoose.isValidObjectId(req.body.registro_id)) {
      await RegistroError.findByIdAndUpdate(req.body.registro_id, { estado: req.body.estado });
    }

    return res.redirect('/admin/errores');
  }

  const [lista, total, pendientes] = await Promise.all([
    RegistroError.find().populate('usuario', 'nombre apellido').sort({ createdAt: -1 }).limit(200),
    RegistroError.countDocuments(),
    RegistroError.countDocuments({ estado: 'pendiente' })
  ]);

  return res.render('administrador/admin_errores', {
    layout: 'layouts/dashboard',
    title: 'Errores - TecnoCorte',
    errores: aLista(lista),
    estados_error: ESTADOS_ERROR,
    total_errores: total,
    errores_pendientes: pendientes
  });
}

/** Configuración general del sitio. */
async function configuracion(req, res) {
  const config = await Configuracion.cargar();

  if (req.method === 'POST') {
    config.sitio_nombre = String(req.body.sitio_nombre || '').trim() || 'TecnoCorte';
    config.correo_contacto = String(req.body.correo_contacto || config.correo_contacto).trim();
    config.texto_aviso = String(req.body.texto_aviso || '').trim().slice(0, 300);
    config.registro_abierto = req.body.registro_abierto === 'on';
    config.mostrar_telefonos = req.body.mostrar_telefonos === 'on';
    config.mostrar_ubicaciones = req.body.mostrar_ubicaciones === 'on';
    config.mostrar_galeria = req.body.mostrar_galeria === 'on';
    config.mostrar_calificaciones = req.body.mostrar_calificaciones === 'on';
    config.modo_mantenimiento = req.body.modo_mantenimiento === 'on';
    config.mensaje_mantenimiento = String(req.body.mensaje_mantenimiento || '').trim().slice(0, 300);

    await config.save();
    return res.redirect('/admin/configuracion');
  }

  return res.render('administrador/admin_configuracion', {
    layout: 'layouts/dashboard',
    title: 'Configuración - TecnoCorte',
    config: aObjeto(config)
  });
}

/** Elige los servicios y productos destacados del inicio. */
async function editarInicio(req, res) {
  const config = await Configuracion.cargar();
  const servicios = await catalogoServicios();
  const productos = await Producto.find({ disponible: true }).sort({ categoria: 1, nombre: 1 });

  if (req.method === 'POST') {
    const nombres = new Set(servicios.map((servicio) => servicio.nombre));
    const ids = new Set(productos.map((producto) => String(producto._id)));

    const servicioElegido = (campo) => {
      const nombre = String(req.body[campo] || '').trim();
      return nombres.has(nombre) ? nombre : '';
    };

    const productoElegido = (campo) => {
      const id = String(req.body[campo] || '');
      return ids.has(id) ? id : null;
    };

    config.servicio_destacado_1 = servicioElegido('servicio_destacado_1');
    config.servicio_destacado_2 = servicioElegido('servicio_destacado_2');
    config.producto_destacado_1 = productoElegido('producto_destacado_1');
    config.producto_destacado_2 = productoElegido('producto_destacado_2');
    await config.save();

    return res.redirect('/admin/editar-inicio');
  }

  return res.render('administrador/admin_editar_inicio', {
    layout: 'layouts/dashboard',
    title: 'Editar inicio - TecnoCorte',
    config: aObjeto(config),
    servicios,
    productos: aLista(productos),
    seleccion_servicios: [config.servicio_destacado_1, config.servicio_destacado_2],
    seleccion_productos: [
      config.producto_destacado_1 ? String(config.producto_destacado_1) : null,
      config.producto_destacado_2 ? String(config.producto_destacado_2) : null
    ],
    productos_por_defecto: 'Pomada para el Cabello, Aceite para Barba'
  });
}

/** Solicitudes de servicios que hacen los barberos. */
async function solicitudesServicios(req, res) {
  if (req.method === 'POST' && mongoose.isValidObjectId(req.body.solicitud_id)) {
    const solicitud = await SolicitudServicio.findById(req.body.solicitud_id).populate('barbero');

    if (solicitud && solicitud.estado === 'pendiente') {
      const nota = String(req.body.nota_admin || '').trim().slice(0, 300);

      if (req.body.accion === 'aprobar') {
        const existe = await Servicio.findOne({ barbero: solicitud.barbero._id, nombre: solicitud.nombre });

        if (!existe) {
          await Servicio.create({
            nombre: solicitud.nombre,
            descripcion: solicitud.descripcion,
            duracion: solicitud.duracion,
            minutos: solicitud.minutos,
            precio: solicitud.precio,
            barbero: solicitud.barbero._id,
            peluqueria: await peluqueriaDelBarbero(solicitud.barbero._id)
          });
        }

        solicitud.estado = 'aprobada';
        solicitud.resuelta = new Date();
        solicitud.nota_admin = nota;
        await solicitud.save();

        await Notificacion.create({
          usuario: solicitud.barbero._id,
          tipo: 'sistema',
          titulo: 'Servicio aprobado',
          mensaje: `El administrador creó tu servicio «${solicitud.nombre}» por $${solicitud.precio} COP.`
        });
      } else if (req.body.accion === 'rechazar') {
        solicitud.estado = 'rechazada';
        solicitud.resuelta = new Date();
        solicitud.nota_admin = nota;
        await solicitud.save();

        await Notificacion.create({
          usuario: solicitud.barbero._id,
          tipo: 'sistema',
          titulo: 'Servicio rechazado',
          mensaje: `El administrador rechazó tu solicitud del servicio «${solicitud.nombre}».${nota ? ` Motivo: ${nota}` : ''}`
        });
      }
    }

    return res.redirect('/admin/solicitudes-servicios');
  }

  const [pendientes, resueltas, serviciosBarberos] = await Promise.all([
    SolicitudServicio.find({ estado: 'pendiente' })
      .populate({ path: 'barbero', select: 'nombre apellido email peluqueria_id', populate: { path: 'peluqueria_id', select: 'nombre' } })
      .sort({ createdAt: -1 }),
    SolicitudServicio.find({ estado: { $ne: 'pendiente' } })
      .populate({ path: 'barbero', select: 'nombre apellido peluqueria_id', populate: { path: 'peluqueria_id', select: 'nombre' } })
      .sort({ resuelta: -1 })
      .limit(30),
    Servicio.find().populate('barbero', 'nombre apellido').populate('peluqueria', 'nombre').sort({ nombre: 1 })
  ]);

  return res.render('administrador/admin_solicitudes_servicios', {
    layout: 'layouts/dashboard',
    title: 'Solicitudes de servicios - TecnoCorte',
    pendientes: aLista(pendientes),
    resueltas: aLista(resueltas),
    servicios_barberos: aLista(serviciosBarberos)
  });
}

/** Perfil del administrador. */
async function perfil(req, res) {
  const usuario = await Usuario.findById(req.usuario._id);
  if (!usuario) return res.redirect('/login');

  if (req.method === 'POST') {
    usuario.nombre = String(req.body.nombre || usuario.nombre).trim();
    usuario.apellido = String(req.body.apellido || usuario.apellido).trim();

    if (req.file) usuario.foto = { url: `/uploads/${req.file.filename}`, public_id: req.file.filename };

    await usuario.save();
    return res.redirect('/admin/perfil');
  }

  return res.render('administrador/admin_perfil', {
    layout: 'layouts/dashboard',
    title: 'Mi Perfil - Admin TecnoCorte',
    usuario: aObjeto(usuario),
    citas: [],
    pedidos: [],
    calificaciones_reservas: [],
    notificaciones: aLista(await Notificacion.find({ usuario: usuario._id }).sort({ createdAt: -1 }))
  });
}

/** Notificaciones del administrador. */
async function notificaciones(req, res) {
  const lista = await Notificacion.find({ usuario: req.usuario._id })
    .populate('reserva', 'fecha hora servicio estado')
    .sort({ createdAt: -1 });

  await Notificacion.updateMany({ usuario: req.usuario._id, leida: false }, { leida: true });

  return res.render('administrador/admin_notificaciones', {
    layout: 'layouts/dashboard',
    title: 'Notificaciones - TecnoCorte',
    notificaciones: aLista(lista)
  });
}

module.exports = {
  acciones,
  actualizarPedido,
  cancelarReserva,
  configuracion,
  dashboard,
  editarInicio,
  eliminarBloqueo,
  eliminarImagenGaleria,
  eliminarPeluqueria,
  eliminarPeluquero,
  eliminarProducto,
  eliminarReserva,
  eliminarUsuario,
  errores,
  exportarPedidos,
  exportarReservas,
  formularioPeluqueria,
  formularioPeluquero,
  formularioProducto,
  formularioReserva,
  formularioUsuario,
  galeria,
  guardarPeluqueria,
  guardarPeluquero,
  guardarProducto,
  guardarReserva,
  guardarUsuario,
  horarios,
  ingresos,
  mensajes,
  notificaciones,
  pedidos,
  peluquerias,
  peluqueros,
  perfil,
  productos,
  quitarFotoPeluqueria,
  quitarFotoUsuario,
  quitarImagenProducto,
  reservas,
  solicitudesServicios,
  suspenderUsuario,
  usuarios
};

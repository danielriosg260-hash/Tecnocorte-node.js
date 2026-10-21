/**
 * Panel del barbero: dashboard con métricas, perfil, agenda y servicios,
 * creación y cambio de estado de citas, edición de su peluquería y galería de fotos.
 */
const mongoose = require('mongoose');
const Usuario = require('../models/usuario.model');
const Peluqueria = require('../models/peluqueria.model');
const Reserva = require('../models/reserva.model');
const Calificacion = require('../models/calificacion.model');
const Notificacion = require('../models/notificacion.model');
const Horario = require('../models/horario.model');
const Bloqueo = require('../models/bloqueo.model');
const Servicio = require('../models/servicio.model');
const SolicitudServicio = require('../models/solicitudservicio.model');
const ImagenPeluqueria = require('../models/imagengaleria.model');
const Ingreso = require('../models/ingreso.model');
const Configuracion = require('../models/configuracion.model');
const { DIAS, DURACIONES_SERVICIO, ESTADOS_RESERVA, SERVICIOS, TRANSICIONES_RESERVA } = require('../config/constantes');
const { catalogoServicios, buscarServicioCatalogo } = require('../servicios/catalogo');
const { dosHorasAntes, inicioDelDia, validarCita } = require('../servicios/disponibilidad');
const { notificarReserva } = require('../servicios/notificaciones');
const { registrarAccion } = require('../servicios/log');
const { claveFecha, fechaLocal, minutosDeHora } = require('../utils/fechas');
const { aLista, aObjeto } = require('../utils/objetos');
const { urlSubida } = require('../middleware/subida');

// ---- Constantes locales ----

/** Secciones (pestañas) disponibles en la zona de configuración del barbero. */
const PESTANAS = ['portafolio', 'agenda', 'servicios', 'notificaciones'];

/** Mensaje por defecto cuando el barbero no tiene sede asignada. */
const SIN_PELUQUERIA = 'Tu barbería aún no está asignada. Pídele al administrador que te cree una o te asigne a una existente.';

/**
 * Devuelve la peluquería del barbero: primero la que tiene como dueño,
 * luego la asignada en su perfil y por último la de su primera cita.
 */
async function peluqueriaDelBarbero(usuarioId) {
  const propia = await Peluqueria.findOne({ dueno: usuarioId });
  if (propia) return propia;

  const usuario = await Usuario.findById(usuarioId);
  if (usuario && usuario.peluqueria_id) {
    const asignada = await Peluqueria.findById(usuario.peluqueria_id);
    if (asignada) return asignada;
  }

  const reserva = await Reserva.findOne({ peluquero: usuarioId, peluqueria: { $ne: null } })
    .sort({ fecha: 1 })
    .populate('peluqueria');

  if (reserva && reserva.peluqueria) {
    reserva.peluqueria.dueno = usuarioId;
    await reserva.peluqueria.save();
    return reserva.peluqueria;
  }

  return null;
}

/** Precio de un servicio del catálogo (0 si ya no existe). */
function precioServicio(catalogo, nombre) {
  const servicio = catalogo.find((item) => item.nombre === nombre);
  return servicio ? servicio.precio : 0;
}

// ---- Panel y perfil ----

/** Panel principal del barbero con métricas, citas y reseñas. */
async function dashboard(req, res) {
  const [reservas, catalogo, config] = await Promise.all([
    Reserva.find({ peluquero: req.usuario._id })
      .populate('cliente', 'nombre apellido foto')
      .populate('peluqueria', 'nombre')
      .sort({ fecha: 1, hora: 1 }),
    catalogoServicios(),
    Configuracion.cargar()
  ]);

  const citas = aLista(reservas);
  const hoy = claveFecha(new Date());
  const citasHoy = citas.filter((cita) => claveFecha(cita.fecha) === hoy);
  const completadas = citas.filter((cita) => cita.estado === 'Completada');

  // La próxima cita es la primera Pendiente o Confirmada cuya fecha y hora aún no pasan.
  const proxima = citas.find((cita) =>
    ['Pendiente', 'Confirmada'].includes(cita.estado) &&
    fechaLocal(claveFecha(cita.fecha), cita.hora) > new Date()
  );

  const calificaciones = aLista(
    await Calificacion.find({ peluquero: req.usuario._id })
      .populate('cliente', 'nombre apellido')
      .sort({ createdAt: -1 })
      .limit(5)
  );

  // Promedio de las últimas 5 reseñas, redondeado a un decimal.
  const suma = calificaciones.reduce((total, item) => total + item.puntuacion, 0);
  const peluqueria = await peluqueriaDelBarbero(req.usuario._id);
  const fotos = peluqueria
    ? aLista(await ImagenPeluqueria.find({ peluqueria: peluqueria._id }).sort({ createdAt: -1 }))
    : [];

  return res.render('peluqueros/peluquero_dashboard', {
    layout: 'layouts/dashboard',
    title: 'TecnoCorte - Panel de Barbero',
    citas,
    citas_hoy: citasHoy,
    citas_pendientes: citas.filter((cita) => cita.estado === 'Pendiente'),
    citas_completadas: completadas,
    citas_canceladas: citas.filter((cita) => cita.estado === 'Cancelada'),
    total_citas: citas.length,
    // Ingresos = precio del catálogo de cada cita Completada (hoy y acumulado).
    ingresos_hoy: citasHoy
      .filter((cita) => cita.estado === 'Completada')
      .reduce((total, cita) => total + precioServicio(catalogo, cita.servicio), 0),
    ingresos_total: completadas.reduce((total, cita) => total + precioServicio(catalogo, cita.servicio), 0),
    calificaciones,
    promedio: calificaciones.length ? Math.round((suma / calificaciones.length) * 10) / 10 : 0,
    total_calificaciones: calificaciones.length,
    proxima_cita: proxima || null,
    peluqueria: aObjeto(peluqueria),
    fotos,
    config: aObjeto(config),
    error: req.query.error || ''
  });
}

/** Perfil público del barbero con su historial y calificaciones. */
async function perfil(req, res) {
  const usuario = await Usuario.findById(req.usuario._id);
  if (!usuario) return res.redirect('/login');

  if (req.method === 'POST') {
    usuario.nombre = String(req.body.nombre || usuario.nombre).trim();
    usuario.apellido = String(req.body.apellido || usuario.apellido).trim();
    usuario.telefono = String(req.body.telefono || '').trim();

    if (req.file) usuario.foto = { url: urlSubida(req.file), public_id: req.file.public_id || req.file.filename };

    await usuario.save();
    return res.redirect('/barbero/perfil');
  }

  const [citas, calificaciones, peluqueria, config] = await Promise.all([
    Reserva.find({ peluquero: usuario._id })
      .populate('cliente', 'nombre apellido')
      .populate('peluqueria', 'nombre')
      .sort({ fecha: -1 }),
    Calificacion.find({ peluquero: usuario._id })
      .populate('cliente', 'nombre apellido')
      .populate('reserva', 'servicio')
      .sort({ createdAt: -1 }),
    peluqueriaDelBarbero(usuario._id),
    Configuracion.cargar()
  ]);

  const suma = calificaciones.reduce((total, item) => total + item.puntuacion, 0);

  return res.render('peluqueros/peluquero_perfil', {
    layout: 'layouts/dashboard',
    title: 'TecnoCorte - Mi Perfil',
    usuario: aObjeto(usuario),
    citas: citas.map((cita) => ({
      ...aObjeto(cita),
      cliente: aObjeto(cita.cliente) || { nombre: '', apellido: '' },
      peluqueria: aObjeto(cita.peluqueria) || { nombre: '' }
    })),
    calificaciones: calificaciones.map((calificacion) => ({
      ...aObjeto(calificacion),
      cliente: aObjeto(calificacion.cliente) || { nombre: '', apellido: '' },
      reserva: aObjeto(calificacion.reserva)
    })),
    promedio: calificaciones.length ? Math.round((suma / calificaciones.length) * 10) / 10 : 0,
    total_calificaciones: calificaciones.length,
    peluqueria: aObjeto(peluqueria),
    config: aObjeto(config)
  });
}

// ---- Configuración ----

/** Agenda con horarios y bloqueos de la peluquería del barbero. */
async function cargarAgenda(peluqueria) {
  if (!peluqueria) return { horarios: [], bloqueos: [] };

  const [guardados, bloqueos] = await Promise.all([
    Horario.find({ peluqueria: peluqueria._id }).sort({ dia_semana: 1 }),
    Bloqueo.find({ peluqueria: peluqueria._id }).sort({ fecha: -1, hora: 1 }).limit(10)
  ]);

  const horarios = [0, 1, 2, 3, 4, 5, 6].map((dia) => {
    // Si la sede no guardó ese día se usa el default: activo de lunes a sábado, 9–18.
    const guardado = guardados.find((item) => item.dia_semana === dia);

    return {
      dia_semana: dia,
      dia_semana_display: DIAS[dia],
      activo: guardado ? guardado.activo : dia < 6,
      hora_inicio: guardado ? guardado.hora_inicio : '09:00',
      hora_fin: guardado ? guardado.hora_fin : '18:00'
    };
  });

  return { horarios, bloqueos: aLista(bloqueos) };
}

/** Zona de configuración del barbero. */
async function configuracion(req, res) {
  const usuario = await Usuario.findById(req.usuario._id);
  if (!usuario) return res.redirect('/login');

  const pestana = PESTANAS.includes(req.query.seccion) ? req.query.seccion : 'portafolio';

  if (req.method === 'POST') {
    const accion = req.body.accion;

    if (accion === 'portafolio') {
      usuario.nombre = String(req.body.nombre || usuario.nombre).trim() || usuario.nombre;
      usuario.apellido = String(req.body.apellido || usuario.apellido).trim() || usuario.apellido;
      usuario.telefono = String(req.body.telefono || '').trim();

      if (req.file) usuario.foto = { url: urlSubida(req.file), public_id: req.file.public_id || req.file.filename };

      await usuario.save();
      return res.redirect('/barbero/configuracion?seccion=portafolio');
    }

    if (accion === 'notificaciones') {
      usuario.aviso_correo = req.body.correo === 'on';
      usuario.aviso_whatsapp = req.body.whatsapp === 'on';
      usuario.aviso_sms = req.body.sms === 'on';
      usuario.aviso_anticipacion_horas = Math.min(72, Math.max(1, Number(req.body.anticipacion) || 2));
      await usuario.save();
      return res.redirect('/barbero/configuracion?seccion=notificaciones');
    }

    if (accion === 'solicitar_servicio') {
      const destino = '/barbero/configuracion?seccion=servicios';
      const nombre = String(req.body.nombre || '').trim();
      // Se limpian separadores de miles y decimales ("12.500" → 12500) antes de validar.
      const precio = Number(String(req.body.precio || '').replace(/[.,\s]/g, ''));
      const minutos = Number(req.body.minutos);

      // Nombre vacío/muy largo, servicio ya incluido en el catálogo base o duración inválida: se ignora.
      if (!nombre || nombre.length > 100) return res.redirect(destino);
      if (SERVICIOS.some((servicio) => servicio.nombre === nombre)) return res.redirect(destino);
      if (!Number.isFinite(precio) || precio < 0 || !DURACIONES_SERVICIO.includes(minutos)) {
        return res.redirect(destino);
      }

      const yaLoTiene = await Servicio.findOne({ barbero: usuario._id, nombre });
      const yaPidio = await SolicitudServicio.findOne({ barbero: usuario._id, nombre, estado: 'pendiente' });
      if (yaLoTiene || yaPidio) return res.redirect(destino);

      await SolicitudServicio.create({
        barbero: usuario._id,
        nombre,
        descripcion: String(req.body.descripcion || '').trim().slice(0, 300),
        duracion: `${minutos} Minutos`,
        minutos,
        precio
      });

      return res.redirect(destino);
    }

    if (accion === 'cancelar_solicitud') {
      if (mongoose.isValidObjectId(req.body.solicitud_id)) {
        await SolicitudServicio.findOneAndDelete({
          _id: req.body.solicitud_id,
          barbero: usuario._id,
          estado: 'pendiente'
        });
      }

      return res.redirect('/barbero/configuracion?seccion=servicios');
    }
  }

  const peluqueria = await peluqueriaDelBarbero(usuario._id);
  const [misServicios, solicitudes, agenda, fotos, ingresos] = await Promise.all([
    Servicio.find({ barbero: usuario._id }).sort({ nombre: 1 }),
    SolicitudServicio.find({ barbero: usuario._id }).sort({ createdAt: -1 }).limit(20),
    cargarAgenda(peluqueria),
    peluqueria ? ImagenPeluqueria.find({ peluqueria: peluqueria._id }).sort({ createdAt: -1 }).limit(12) : [],
    Ingreso.find({ usuario: usuario._id }).sort({ fecha: -1 }).limit(5).lean()
  ]);

  return res.render('peluqueros/peluquero_configuracion', {
    layout: 'layouts/dashboard',
    title: 'TecnoCorte - Configuración de Barbero',
    usuario: aObjeto(usuario),
    pestana,
    pestanas: PESTANAS,
    peluqueria: aObjeto(peluqueria),
    servicios: SERVICIOS,
    mis_servicios: aLista(misServicios),
    solicitudes: aLista(solicitudes),
    solicitudes_pendientes: solicitudes.filter((item) => item.estado === 'pendiente').length,
    duraciones: DURACIONES_SERVICIO,
    horarios: agenda.horarios,
    bloqueos: agenda.bloqueos,
    fotos: aLista(fotos),
    ingresos
  });
}

// ---- Citas ----

/** Formulario para que el barbero agende una cita a un cliente. */
async function crearCita(req, res) {
  const clientes = aLista(await Usuario.find({ rol: 'Cliente', activo: { $ne: false } }).sort({ nombre: 1 }));
  const peluquerias = aLista(await Peluqueria.find().sort({ nombre: 1 }));
  const servicios = await catalogoServicios();

  const vista = {
    layout: 'layouts/dashboard',
    title: 'Nueva Cita - TecnoCorte',
    clientes,
    peluquerias,
    servicios,
    reserva_estados: ESTADOS_RESERVA,
    error: ''
  };

  if (req.method === 'GET') return res.render('peluqueros/peluquero_crear_cita', vista);

  const cliente = mongoose.isValidObjectId(req.body.cliente)
    ? await Usuario.findOne({ _id: req.body.cliente, rol: 'Cliente' })
    : null;
  const peluqueria = mongoose.isValidObjectId(req.body.peluqueria)
    ? await Peluqueria.findById(req.body.peluqueria)
    : null;
  const servicio = await buscarServicioCatalogo(req.body.servicio);

  if (!cliente || !peluqueria || !servicio) {
    return res.status(400).render('peluqueros/peluquero_crear_cita', {
      ...vista,
      error: 'Selecciona un cliente, una peluquería y un servicio válidos.'
    });
  }

  const error = await validarCita(
    { Usuario, Horario, Bloqueo, Reserva },
    {
      peluqueria: peluqueria._id,
      peluquero: req.usuario._id,
      fecha: req.body.fecha,
      hora: req.body.hora,
      minutos: servicio.minutos
    }
  );

  if (error) return res.status(400).render('peluqueros/peluquero_crear_cita', { ...vista, error });

  try {
    const reserva = await Reserva.create({
      cliente: cliente._id,
      peluqueria: peluqueria._id,
      peluquero: req.usuario._id,
      fecha: new Date(`${req.body.fecha}T00:00:00`),
      hora: req.body.hora,
      servicio: servicio.nombre,
      minutos: servicio.minutos,
      estado: 'Pendiente'
    });

    await notificarReserva(reserva._id, 'reservada');
    return res.redirect('/barbero');
  } catch (creationError) {
    const mensaje = creationError.code === 11000
      ? 'Ese horario ya está ocupado.'
      : 'No se pudo crear la cita.';

    return res.status(400).render('peluqueros/peluquero_crear_cita', { ...vista, error: mensaje });
  }
}

/** Cambia el estado de una cita del barbero. */
async function cambiarEstadoCita(req, res) {
  const reserva = await Reserva.findOne({ _id: req.params.id, peluquero: req.usuario._id });
  const nuevoEstado = req.body.estado;

  if (!reserva || !ESTADOS_RESERVA.some(([valor]) => valor === nuevoEstado)) {
    return res.redirect('/barbero');
  }

  const permitidos = TRANSICIONES_RESERVA[reserva.estado] || [];
  if (!permitidos.includes(nuevoEstado)) {
    return res.redirect('/barbero?error=' + encodeURIComponent('Ese cambio de estado no está permitido.'));
  }

  const anterior = reserva.estado;
  reserva.estado = nuevoEstado;

  if (nuevoEstado === 'Cancelada') {
    reserva.motivo_cancelacion = 'Cancelada por el barbero.';
    reserva.requiere_reprogramacion = false;
    reserva.motivo_reprogramacion = '';
  }

  // Cancelar o marcar inasistencia requiere que la cita aún no haya empezado
  // (cancelación) o que ya haya terminado (inasistencia).
  if (nuevoEstado === 'Cancelada' && !dosHorasAntes(claveFecha(reserva.fecha), reserva.hora)) {
    return res.redirect('/barbero?error=' + encodeURIComponent('Solo puedes cancelar con 2 horas de anticipación.'));
  }

  if (nuevoEstado === 'NoAsistio' && new Date(`${claveFecha(reserva.fecha)}T${reserva.hora}:00`).getTime() + (reserva.minutos || 30) * 60000 > Date.now()) {
    return res.redirect('/barbero?error=' + encodeURIComponent('La cita todavía no ha terminado.'));
  }

  await reserva.save();
  await registrarAccion(req, 'actualizar_cita', 'Reserva', reserva._id, `Estado: ${anterior} a ${nuevoEstado}`);
  await notificarReserva(reserva._id, nuevoEstado.toLowerCase());

  return res.redirect('/barbero');
}

// ---- Peluquería y galería ----

/** Formulario para editar la peluquería del barbero. */
async function editarPeluqueria(req, res) {
  const peluqueria = await peluqueriaDelBarbero(req.usuario._id);
  if (!peluqueria) return res.redirect('/barbero');

  if (req.method === 'POST') {
    peluqueria.nombre = String(req.body.nombre || peluqueria.nombre).trim();
    peluqueria.ubicacion = String(req.body.ubicacion || peluqueria.ubicacion).trim();
    peluqueria.telefono = String(req.body.telefono || '').trim();
    peluqueria.descripcion = String(req.body.descripcion || '').trim().slice(0, 2000);

    if (req.file) peluqueria.imagen = urlSubida(req.file);

    await peluqueria.save();
    return res.redirect('/barbero/peluqueria');
  }

  return res.render('peluqueros/peluquero_editar_peluqueria', {
    layout: 'layouts/dashboard',
    title: 'Mi peluquería - TecnoCorte',
    peluqueria: aObjeto(peluqueria)
  });
}

/** Galería de fotos de la peluquería. */
async function galeria(req, res) {
  const peluqueria = await peluqueriaDelBarbero(req.usuario._id);
  if (!peluqueria) return res.redirect('/barbero');

  const fotos = await ImagenPeluqueria.find({ peluqueria: peluqueria._id }).sort({ createdAt: -1 });

  return res.render('peluqueros/peluquero_galeria', {
    layout: 'layouts/dashboard',
    title: 'Galería - TecnoCorte',
    peluqueria: aObjeto(peluqueria),
    fotos: aLista(fotos),
    error: req.query.error || ''
  });
}

/** Sube una foto a la galería (máximo 5). */
async function agregarImagen(req, res) {
  const peluqueria = await peluqueriaDelBarbero(req.usuario._id);
  if (!peluqueria) return res.redirect('/barbero');

  const total = await ImagenPeluqueria.countDocuments({ peluqueria: peluqueria._id });
  if (total >= 5) return res.redirect('/barbero/galeria?error=galeria-llena');
  if (!req.file) return res.redirect('/barbero/galeria?error=sin-imagen');

  await ImagenPeluqueria.create({
    peluqueria: peluqueria._id,
    url: urlSubida(req.file),
    public_id: req.file.public_id || req.file.filename,
    descripcion: String(req.body.descripcion || '').trim().slice(0, 200)
  });

  return res.redirect('/barbero/galeria');
}

/** Elimina una foto de la galería. */
async function eliminarImagen(req, res) {
  const peluqueria = await peluqueriaDelBarbero(req.usuario._id);

  if (peluqueria && mongoose.isValidObjectId(req.params.id)) {
    await ImagenPeluqueria.findOneAndDelete({ _id: req.params.id, peluqueria: peluqueria._id });
  }

  return res.redirect('/barbero/galeria');
}

module.exports = {
  agregarImagen,
  cambiarEstadoCita,
  configuracion,
  crearCita,
  dashboard,
  editarPeluqueria,
  eliminarImagen,
  galeria,
  peluqueriaDelBarbero,
  perfil,
  SIN_PELUQUERIA
};

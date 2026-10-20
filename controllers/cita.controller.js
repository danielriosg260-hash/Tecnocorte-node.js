const mongoose = require('mongoose');
const Usuario = require('../models/usuario.model');
const Peluqueria = require('../models/peluqueria.model');
const Reserva = require('../models/reserva.model');
const Calificacion = require('../models/calificacion.model');
const Horario = require('../models/horario.model');
const Bloqueo = require('../models/bloqueo.model');
const { ESTADOS_RESERVA } = require('../config/constantes');
const { buscarServicioCatalogo, catalogoServicios } = require('../services/catalogo');
const { dosHorasAntes, horariosBase, inicioDelDia, validarCita } = require('../services/disponibilidad');
const { notificarReserva } = require('../services/notificaciones');
const { claveFecha, fechaLocal } = require('../utils/fechas');
const { aLista, aObjeto } = require('../utils/objetos');

/** Datos que necesita el formulario de reserva (horarios, bloqueos y citas ocupadas). */
async function datosAgenda() {
  const peluquerias = await Peluqueria.find().sort({ nombre: 1 });
  const barberos = await Usuario.find({ rol: 'Barbero', activo: { $ne: false } }).select('nombre apellido foto peluqueria_id');

  const reservas = await Reserva.find({ fecha: { $gte: inicioDelDia() } }).select('peluquero fecha hora minutos');

  const horarios = {};
  peluquerias.forEach((peluqueria) => {
    horarios[String(peluqueria._id)] = horariosBase();
  });

  const guardados = await Horario.find({ peluqueria: { $in: peluquerias.map((p) => p._id) } });
  guardados.forEach((horario) => {
    const id = String(horario.peluqueria);
    if (!horarios[id]) return;
    horarios[id][horario.dia_semana] = {
      activo: horario.activo,
      inicio: horario.hora_inicio,
      fin: horario.hora_fin
    };
  });

  const bloqueos = (
    await Bloqueo.find({
      peluqueria: { $in: peluquerias.map((p) => p._id) },
      fecha: { $gte: inicioDelDia() }
    })
  ).map((bloqueo) => ({ fecha: claveFecha(bloqueo.fecha), hora: bloqueo.hora || null }));

  return {
    peluquerias: aLista(peluquerias),
    peluqueros: barberos.map((barbero) => ({
      ...aObjeto(barbero),
      peluqueria_id: barbero.peluqueria_id ? String(barbero.peluqueria_id) : ''
    })),
    horarios_json: JSON.stringify(horarios),
    bloqueos_json: JSON.stringify(bloqueos),
    reservas_json: JSON.stringify(
      reservas.map((reserva) => ({
        barbero: String(reserva.peluquero),
        fecha: claveFecha(reserva.fecha),
        hora: reserva.hora,
        minutos: reserva.minutos || 30
      }))
    )
  };
}

/** Formulario para agendar una cita. */
async function reservarCita(req, res) {
  const ahora = new Date();
  const servicios = await catalogoServicios();
  const servicioInicial = servicios.find((servicio) => servicio.nombre === req.query.servicio);
  const peluqueriaInicial = mongoose.isValidObjectId(req.query.peluqueria)
    ? await Peluqueria.findById(req.query.peluqueria)
    : null;

  const agenda = await datosAgenda();

  return res.render('usuarios/usuario_reservar_cita', {
    layout: false,
    ...agenda,
    // Si se entra desde una barbería solo se ofrece esa sede.
    peluquerias: peluqueriaInicial ? [aObjeto(peluqueriaInicial)] : agenda.peluquerias,
    servicios,
    fecha_hoy: claveFecha(ahora),
    hora_actual: ahora.toTimeString().slice(0, 5),
    servicio_inicial: servicioInicial ? servicioInicial.nombre : '',
    peluqueria_inicial: peluqueriaInicial ? String(peluqueriaInicial._id) : '',
    peluqueria_inicial_obj: aObjeto(peluqueriaInicial),
    error: req.query.error || '',
    form_post: ''
  });
}

/** Muestra la vista previa antes de guardar la cita. */
async function preConfirmar(req, res) {
  const servicio = await buscarServicioCatalogo(req.body.servicio);

  if (!servicio || !mongoose.isValidObjectId(req.body.peluqueria) || !mongoose.isValidObjectId(req.body.peluquero) || !req.body.fecha || !req.body.hora) {
    return res.redirect('/reservar-cita');
  }

  const [peluqueria, peluquero] = await Promise.all([
    Peluqueria.findById(req.body.peluqueria),
    Usuario.findOne({
      _id: req.body.peluquero,
      rol: 'Barbero',
      activo: { $ne: false },
      peluqueria_id: req.body.peluqueria
    })
  ]);

  if (!peluqueria || !peluquero) return res.redirect('/reservar-cita');

  return res.render('usuarios/usuario_confirmar_reserva', {
    layout: false,
    datos: {
      servicio: servicio.nombre,
      precio: servicio.precio,
      duracion: servicio.minutos,
      fecha: req.body.fecha,
      hora: req.body.hora,
      peluqueria: aObjeto(peluqueria),
      peluquero: aObjeto(peluquero)
    }
  });
}

/** Guarda la cita después de validar disponibilidad. */
async function confirmarReserva(req, res) {
  const servicio = await buscarServicioCatalogo(req.body.servicio);

  if (!servicio) {
    return res.redirect(`/reservar-cita?error=${encodeURIComponent('Selecciona un servicio válido.')}`);
  }

  const error = await validarCita(
    { Usuario, Horario, Bloqueo, Reserva },
    {
      peluqueria: req.body.peluqueria,
      peluquero: req.body.peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      minutos: servicio.minutos
    }
  );

  if (error) return res.redirect(`/reservar-cita?error=${encodeURIComponent(error)}`);

  try {
    const reserva = await Reserva.create({
      cliente: req.usuario._id,
      peluqueria: req.body.peluqueria,
      peluquero: req.body.peluquero,
      fecha: new Date(`${req.body.fecha}T00:00:00`),
      hora: req.body.hora,
      servicio: servicio.nombre,
      minutos: servicio.minutos
    });

    void notificarReserva(reserva._id, 'reservada');
    return res.redirect('/perfil');
  } catch (creationError) {
    const mensaje = creationError.code === 11000
      ? 'Ese horario acaba de ser reservado por otra persona. Elige otra hora.'
      : 'No se pudo reservar la cita. Inténtalo de nuevo.';

    return res.redirect(`/reservar-cita?error=${encodeURIComponent(mensaje)}`);
  }
}

/** Formulario para modificar una cita existente. */
async function editarReserva(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/perfil');

  const reserva = await Reserva.findOne({
    _id: req.params.id,
    cliente: req.usuario._id,
    estado: { $nin: ['Cancelada', 'Completada'] }
  }).populate('peluquero peluqueria');

  if (!reserva) return res.redirect('/perfil');

  return res.render('usuarios/usuario_editar_reserva', {
    layout: 'layouts/dashboard',
    title: 'Modificar cita - TecnoCorte',
    bodyClass: 'font-body antialiased bg-surface',
    error: req.query.error || '',
    reserva: {
      ...aObjeto(reserva),
      peluquero: aObjeto(reserva.peluquero) || { activo: false },
      peluqueria_id: String(reserva.peluqueria ? reserva.peluqueria._id : ''),
      peluquero_id: String(reserva.peluquero ? reserva.peluquero._id : '')
    },
    servicios: await catalogoServicios(),
    peluquerias: aLista(await Peluqueria.find()),
    peluqueros: aLista(await Usuario.find({ rol: 'Barbero', activo: { $ne: false } }))
  });
}

/** Guarda los cambios de una cita. */
async function actualizarReserva(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.redirect('/perfil');

    const servicio = await buscarServicioCatalogo(req.body.servicio);
    const actual = await Reserva.findOne({ _id: req.params.id, cliente: req.usuario._id });
    if (!actual) return res.redirect('/perfil');

    if (!servicio || !dosHorasAntes(claveFecha(actual.fecha), actual.hora)) {
      return res.redirect(
        `/editar-reserva/${req.params.id}?error=${encodeURIComponent('Los cambios deben hacerse con al menos 2 horas de anticipación.')}`
      );
    }

    const error = await validarCita(
      { Usuario, Horario, Bloqueo, Reserva },
      {
        peluqueria: req.body.peluqueria,
        peluquero: req.body.peluquero,
        fecha: req.body.fecha,
        hora: req.body.hora,
        minutos: servicio.minutos,
        excluir: actual._id
      }
    );

    if (error) return res.redirect(`/editar-reserva/${req.params.id}?error=${encodeURIComponent(error)}`);

    await Reserva.findByIdAndUpdate(
      actual._id,
      {
        servicio: servicio.nombre,
        peluqueria: req.body.peluqueria,
        peluquero: req.body.peluquero,
        fecha: new Date(`${req.body.fecha}T00:00:00`),
        hora: req.body.hora,
        minutos: servicio.minutos,
        estado: 'Pendiente',
        requiere_reprogramacion: false,
        motivo_reprogramacion: ''
      },
      { runValidators: true }
    );

    void notificarReserva(actual._id, 'modificada');
    return res.redirect('/perfil');
  } catch (error) {
    const mensaje = error.code === 11000 ? 'Ese horario ya está ocupado.' : 'No se pudo modificar la cita.';
    return res.redirect(`/editar-reserva/${req.params.id}?error=${encodeURIComponent(mensaje)}`);
  }
}

/** Cancela una cita del cliente. */
async function cancelarReserva(req, res) {
  const reserva = await Reserva.findOne({
    _id: req.params.id,
    cliente: req.usuario._id,
    estado: { $nin: ['Completada', 'Cancelada'] }
  });

  if (reserva && dosHorasAntes(claveFecha(reserva.fecha), reserva.hora)) {
    await Reserva.findByIdAndUpdate(reserva._id, { estado: 'Cancelada' });
    void notificarReserva(reserva._id, 'cancelada');
  }

  return res.redirect('/perfil');
}

/** El cliente confirma una cita que agendó el barbero. */
async function confirmarCita(req, res) {
  const reserva = await Reserva.findOneAndUpdate(
    { _id: req.params.id, cliente: req.usuario._id, estado: 'Pendiente' },
    { estado: 'Confirmada' },
    { new: true }
  );

  if (reserva) void notificarReserva(reserva._id, 'confirmada');

  return res.redirect('/notificaciones');
}

/** Guarda la calificación de una cita completada. */
async function calificar(req, res) {
  const reserva = await Reserva.findOne({
    _id: req.params.id,
    cliente: req.usuario._id,
    estado: 'Completada'
  });

  const puntuacion = Number(req.body.puntuacion);

  if (reserva && Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5) {
    await Calificacion.findOneAndUpdate(
      { reserva: reserva._id },
      {
        reserva: reserva._id,
        cliente: req.usuario._id,
        peluquero: reserva.peluquero,
        puntuacion,
        comentario: String(req.body.comentario || '').slice(0, 1000)
      },
      { upsert: true, runValidators: true }
    );
  }

  return res.redirect('/perfil');
}

module.exports = {
  actualizarReserva,
  calificar,
  cancelarReserva,
  confirmarCita,
  confirmarReserva,
  editarReserva,
  preConfirmar,
  reservarCita
};

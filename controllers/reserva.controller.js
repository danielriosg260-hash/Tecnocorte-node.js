const Reserva = require("../models/reserva.model");
const Usuario = require("../models/usuario.model");
const Peluqueria = require("../models/peluqueria.model");
const transporter = require("../config/email");
const { enviarCorreoBonito, escapeHtml } = require("../config/emailtemplate");

const {
  esFecha: fechaValida,
  minutosDeHora: minutosHora,
  inicioDelDiaDate: fechaInicio,
} = require("../utils/fechas");

const ESTADOS_ACTIVOS = ["Pendiente", "Confirmada", "Completada", "Reprogramar"];
const ESTADOS_VALIDOS = [...ESTADOS_ACTIVOS, "Cancelada"];

function esIdValido(id) {
  return require("mongoose").isValidObjectId(id);
}

async function validarReserva({
  cliente,
  peluqueria,
  peluquero,
  fecha,
  hora,
  servicio,
  minutos,
  estado,
  excluir,
}) {
  if (!esIdValido(cliente) || !esIdValido(peluqueria) || !esIdValido(peluquero)) {
    return "Los identificadores de la reserva no son válidos.";
  }
  const inicio = minutosHora(hora);
  const duracion = Number(minutos);
  if (inicio < 0 || !Number.isInteger(duracion) || duracion < 15 || duracion > 480) {
    return "La hora o duración de la reserva no son válidas.";
  }
  if (!fechaValida(fecha)) return "La fecha debe ser válida.";
  if (typeof servicio !== "string" || !servicio.trim() || servicio.length > 120)
    return "El servicio no es válido.";

  const fechaTexto = fecha instanceof Date ? fecha.toISOString().slice(0, 10) : fecha;
  const fechaHora = new Date(fechaTexto + "T" + hora + ":00");
  if (fechaHora <= new Date()) return "La fecha y hora deben estar en el futuro.";

  if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado))
    return "El estado de la reserva no es válido.";

  const clienteDoc = await Usuario.findOne({ _id: cliente, rol: "Cliente", activo: { $ne: false } }).select(
    "_id email nombre",
  );
  const peluqueriaDoc = await Peluqueria.findById(peluqueria).select("_id nombre");
  const peluqueroDoc = await Usuario.findOne({
    _id: peluquero,
    rol: "Barbero",
    activo: { $ne: false },
    peluqueria_id: peluqueria,
  }).select("_id email nombre");
  if (!clienteDoc) return "El cliente no existe o no está disponible.";
  if (!peluqueriaDoc) return "La peluquería no existe.";
  if (!peluqueroDoc) return "El barbero no está disponible para esta peluquería.";

  const inicioFecha = fechaInicio(fecha);
  const finFecha = new Date(inicioFecha);
  finFecha.setDate(finFecha.getDate() + 1);

  const filtro = { peluquero, fecha: { $gte: inicioFecha, $lt: finFecha }, estado: { $in: ESTADOS_ACTIVOS } };
  if (excluir) filtro._id = { $ne: excluir };
  const reservas = await Reserva.find(filtro).select("hora minutos");

  const fin = inicio + duracion;
  for (const reserva of reservas) {
    const reservaInicio = minutosHora(reserva.hora);
    const reservaFin = reservaInicio + (reserva.minutos || 30);
    if (reservaInicio >= 0 && inicio < reservaFin && fin > reservaInicio) {
      return "Ese horario ya está ocupado.";
    }
  }
  return null;
}

function filtroPropietario(usuario) {
  if (usuario.rol === "Admin") return {};
  if (usuario.rol === "Barbero") return { peluquero: usuario._id };
  return { cliente: usuario._id };
}

async function crear(req, res) {
  try {
    const cliente = req.usuario.rol === "Cliente" ? req.usuario._id : req.body.cliente;
    const peluquero = req.usuario.rol === "Barbero" ? req.usuario._id : req.body.peluquero;
    const minutos = Number(req.body.minutos) || 30;
    const estado = req.usuario.rol === "Admin" ? req.body.estado || "Pendiente" : "Pendiente";
    const error = await validarReserva({
      cliente,
      peluqueria: req.body.peluqueria,
      peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos,
      estado,
    });
    if (error) return res.status(400).json({ mensaje: error });
    const reserva = await Reserva.create({
      cliente,
      peluqueria: req.body.peluqueria,
      peluquero,
      fecha: req.body.fecha,
      hora: req.body.hora,
      servicio: req.body.servicio,
      minutos,
      estado,
    });

    const clienteUsuario = await Usuario.findById(cliente);
    const peluqueria = await Peluqueria.findById(req.body.peluqueria);

    if (clienteUsuario) {
      const fechaFormateada = new Date(reserva.fecha).toLocaleDateString("es-CO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const nombrePeluqueria = peluqueria ? peluqueria.nombre : "la peluquería";

      try {
        await enviarCorreoBonito(transporter, {
          to: clienteUsuario.email,
          subject: "Confirmación de tu reserva en TecnoCorte",
          title: "Tu cita está reservada",
          preheader: "Hemos guardado tu cita en TecnoCorte.",
          greeting: `¡Hola ${clienteUsuario.nombre}!`,
          content: `<p>Tu cita ha sido reservada exitosamente.</p><p><strong>Peluquería:</strong> ${escapeHtml(nombrePeluqueria)}<br><strong>Fecha:</strong> ${escapeHtml(fechaFormateada)}<br><strong>Hora:</strong> ${escapeHtml(reserva.hora)}<br><strong>Servicio:</strong> ${escapeHtml(reserva.servicio || "No especificado")}<br><strong>Estado:</strong> ${escapeHtml(reserva.estado)}</p><p>Te esperamos en TecnoCorte.</p>`,
          text: `Tu cita fue reservada en ${nombrePeluqueria} el ${fechaFormateada} a las ${reserva.hora}.`,
        });
      } catch (emailError) {
        console.error("Error al enviar correo de reserva:", emailError.message);
      }
    }

    res.status(201).json(reserva);
  } catch (error) {
    res.status(400).json({ mensaje: "No se pudo crear la reserva." });
  }
}

async function listarTodos(req, res) {
  try {
    const filtro = filtroPropietario(req.usuario);
    const reservas = await Reserva.find(filtro)
      .populate("cliente", "nombre apellido email telefono rol")
      .populate("peluqueria", "nombre ubicacion telefono")
      .populate("peluquero", "nombre apellido email telefono rol");
    res.status(200).json(reservas);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudieron cargar las reservas" });
  }
}

async function listarUno(req, res) {
  try {
    const reserva = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) })
      .populate("cliente", "nombre apellido email telefono rol")
      .populate("peluqueria", "nombre ubicacion telefono")
      .populate("peluquero", "nombre apellido email telefono rol");
    if (!reserva) {
      return res.status(404).json({ mensaje: "Reserva no encontrada" });
    }
    res.status(200).json(reserva);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo cargar la reserva" });
  }
}

async function actualizar(req, res) {
  try {
    const reservaActual = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) });
    if (!reservaActual) return res.status(404).json({ mensaje: "Reserva no encontrada" });
    const esAdmin = req.usuario.rol === "Admin";
    const camposPermitidos = esAdmin
      ? ["peluqueria", "peluquero", "fecha", "hora", "servicio", "minutos", "estado"]
      : ["peluqueria", "fecha", "hora", "servicio", "minutos"];
    const cambios = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
    });
    const datos = {
      cliente: reservaActual.cliente,
      peluqueria: cambios.peluqueria ?? reservaActual.peluqueria,
      peluquero: esAdmin ? (cambios.peluquero ?? reservaActual.peluquero) : reservaActual.peluquero,
      fecha: cambios.fecha ?? reservaActual.fecha,
      hora: cambios.hora ?? reservaActual.hora,
      servicio: cambios.servicio ?? reservaActual.servicio,
      minutos: cambios.minutos !== undefined ? Number(cambios.minutos) : reservaActual.minutos,
      estado: esAdmin ? (cambios.estado ?? reservaActual.estado) : reservaActual.estado,
    };
    const error = await validarReserva({ ...datos, excluir: reservaActual._id });
    if (error) return res.status(400).json({ mensaje: error });
    const reserva = await Reserva.findOneAndUpdate({ _id: reservaActual._id }, cambios, {
      new: true,
      runValidators: true,
    });
    if (!reserva) {
      return res.status(404).json({ mensaje: "Reserva no encontrada" });
    }
    res.status(200).json(reserva);
  } catch (error) {
    res.status(400).json({ mensaje: "Datos de reserva inválidos." });
  }
}

async function eliminar(req, res) {
  try {
    const reservaActual = await Reserva.findOne({ _id: req.params.id, ...filtroPropietario(req.usuario) });
    if (!reservaActual) return res.status(404).json({ mensaje: "Reserva no encontrada" });
    if (req.usuario.rol !== "Admin" && ["Completada", "Cancelada"].includes(reservaActual.estado)) {
      return res.status(409).json({ mensaje: "Esta reserva ya no se puede eliminar." });
    }
    const reserva = await Reserva.findByIdAndDelete(reservaActual._id);
    if (!reserva) {
      return res.status(404).json({ mensaje: "Reserva no encontrada" });
    }
    res.status(200).json({ mensaje: "Reserva eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo eliminar la reserva" });
  }
}

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar,
};

const { claveFecha, fechaLocal, minutosDeHora } = require('../utils/fechas');

/** Devuelve la fecha de hoy a las 00:00. */
function inicioDelDia() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

/** Horario por defecto de una barbería (lunes a sábado, 9:00 a 18:00). */
function horariosBase() {
  const horarios = {};

  for (let dia = 0; dia <= 6; dia++) {
    horarios[dia] = { activo: dia < 6, inicio: '09:00', fin: '18:00' };
  }

  return horarios;
}

/** true si faltan mínimo dos horas para la cita. */
function dosHorasAntes(fecha, hora) {
  const inicio = fechaLocal(fecha, hora);
  return inicio !== null && inicio.getTime() - Date.now() >= 2 * 60 * 60 * 1000;
}

/** Convierte una fecha a número de día de la semana (0 = lunes). */
function diaHorario(fecha) {
  const date = fechaLocal(fecha);
  return date ? (date.getDay() + 6) % 7 : -1;
}

/**
 * Revisa si el barbero ya tiene una cita que se cruce con el horario pedido.
 */
async function reservasSolapadas(Reserva, { peluquero, fecha, hora, minutos, excluir }) {
  const inicio = minutosDeHora(hora);
  const fin = inicio + Number(minutos);

  const reservas = await Reserva.find({
    peluquero,
    fecha: new Date(`${fecha}T00:00:00`),
    estado: { $in: ['Pendiente', 'Confirmada', 'Completada', 'Reprogramar'] },
    ...(excluir ? { _id: { $ne: excluir } } : {})
  }).select('hora minutos');

  return reservas.some((reserva) => {
    const inicioReserva = minutosDeHora(reserva.hora);
    return inicio < inicioReserva + (reserva.minutos || 30) && fin > inicioReserva;
  });
}

/**
 * Valida una cita completa: fecha futura, barbero activo, horario de atención,
 * bloqueos y cruces con otras citas.
 * Devuelve un mensaje de error o null si todo está bien.
 */
async function validarCita({ Usuario, Horario, Bloqueo, Reserva }, datos) {
  const { peluqueria, peluquero, fecha, hora, minutos, excluir, exigirDosHoras } = datos;

  const inicio = fechaLocal(fecha, hora);
  if (!inicio || inicio <= new Date()) {
    return 'La fecha y hora deben estar en el futuro.';
  }

  if (exigirDosHoras && !dosHorasAntes(fecha, hora)) {
    return 'Los cambios y cancelaciones deben hacerse con al menos 2 horas de anticipación.';
  }

  const [barbero, horario, bloqueo] = await Promise.all([
    Usuario.findOne({ _id: peluquero, rol: 'Barbero', activo: { $ne: false }, peluqueria_id: peluqueria }),
    Horario.findOne({ peluqueria, dia_semana: diaHorario(fecha), activo: true }),
    Bloqueo.findOne({
      peluqueria,
      fecha: new Date(`${fecha}T00:00:00`),
      $or: [{ hora: null }, { hora }]
    })
  ]);

  if (!barbero) return 'El barbero no está disponible para esta barbería.';
  if (!horario) return 'La barbería no atiende ese día.';

  const inicioMinutos = minutosDeHora(hora);
  const finMinutos = inicioMinutos + Number(minutos);

  if (inicioMinutos < minutosDeHora(horario.hora_inicio) || finMinutos > minutosDeHora(horario.hora_fin)) {
    return 'La hora está fuera del horario de atención.';
  }

  if (bloqueo) return 'Ese horario está bloqueado.';

  if (await reservasSolapadas(Reserva, { peluquero, fecha, hora, minutos, excluir })) {
    return 'Ese horario ya está ocupado. Elige otra hora.';
  }

  return null;
}

module.exports = { diaHorario, dosHorasAntes, horariosBase, inicioDelDia, reservasSolapadas, validarCita };

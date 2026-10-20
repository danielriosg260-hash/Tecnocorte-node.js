/**
 * Servicio de disponibilidad horaria de TecnoCorte.
 *
 * Resuelve las reglas de negocio para agendar citas:
 *  - Horario por defecto de la barbería y día de la semana de una fecha.
 *  - Regla de las 2 horas de anticipación para cambios y cancelaciones.
 *  - Detección de citas solapadas del mismo barbero.
 *  - Validación completa de una cita (fecha futura, barbero, horario de
 *    atención, bloqueos y cruces), devolviendo el mensaje de error o null.
 *
 * Recibe los modelos (Usuario, Horario, Bloqueo, Reserva) como parámetros para
 * poder probarse sin depender de la conexión a la base de datos.
 */
const { claveFecha, fechaLocal, minutosDeHora } = require('../utils/fechas');

/**
 * Devuelve la fecha de hoy a las 00:00.
 * @returns {Date} Fecha local de hoy con hora, minutos, segundos y ms en cero.
 */
function inicioDelDia() {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
}

/**
 * Horario por defecto de una barbería (lunes a sábado, 9:00 a 18:00).
 * @returns {object} Mapa por número de día (0 = lunes … 6 = domingo).
 */
function horariosBase() {
  const horarios = {};

  for (let dia = 0; dia <= 6; dia++) {
    // El domingo (día 6) nace inactivo; los demás, activos de 9:00 a 18:00.
    horarios[dia] = { activo: dia < 6, inicio: '09:00', fin: '18:00' };
  }

  return horarios;
}

/**
 * true si faltan mínimo dos horas para la cita.
 * @param {string|Date} fecha Fecha de la cita.
 * @param {string} hora Hora de la cita (HH:MM).
 * @returns {boolean} false si la fecha/hora no se puede interpretar.
 */
function dosHorasAntes(fecha, hora) {
  const inicio = fechaLocal(fecha, hora);
  // Se compara contra el reloj actual: la diferencia debe ser >= 2 horas.
  return inicio !== null && inicio.getTime() - Date.now() >= 2 * 60 * 60 * 1000;
}

/**
 * Convierte una fecha a número de día de la semana (0 = lunes).
 * @param {string|Date} fecha Fecha a convertir.
 * @returns {number} 0 (lunes) a 6 (domingo), o -1 si la fecha es inválida.
 */
function diaHorario(fecha) {
  const date = fechaLocal(fecha);
  return date ? (date.getDay() + 6) % 7 : -1;
}

/**
 * Revisa si el barbero ya tiene una cita que se cruce con el horario pedido.
 * @param {object} Reserva Modelo de reservas (se inyecta para poder probarlo).
 * @param {object} datos peluquero, fecha, hora, minutos y opcionalmente excluir
 *   (id de la cita que se está editando, para que no se consiga a sí misma).
 * @returns {Promise<boolean>} true si hay solape con otra cita activa.
 */
async function reservasSolapadas(Reserva, { peluquero, fecha, hora, minutos, excluir }) {
  const inicio = minutosDeHora(hora);
  const fin = inicio + Number(minutos);

  const reservas = await Reserva.find({
    peluquero,
    fecha: new Date(`${fecha}T00:00:00`),
    // Solo cuentan las citas que siguen ocupando agenda (no canceladas).
    estado: { $in: ['Pendiente', 'Confirmada', 'Completada', 'Reprogramar'] },
    ...(excluir ? { _id: { $ne: excluir } } : {})
  }).select('hora minutos');

  return reservas.some((reserva) => {
    const inicioReserva = minutosDeHora(reserva.hora);
    // Se cruzan si la nueva empieza antes de que termine la otra y termina después de que empiece.
    return inicio < inicioReserva + (reserva.minutos || 30) && fin > inicioReserva;
  });
}

/**
 * Valida una cita completa: fecha futura, barbero activo, horario de atención,
 * bloqueos y cruces con otras citas.
 * Devuelve un mensaje de error o null si todo está bien.
 * @param {object} modelos Se inyectan como { Usuario, Horario, Bloqueo, Reserva }.
 * @param {object} datos peluqueria, peluquero, fecha, hora, minutos y opcionales
 *   excluir (id de la cita en edición) y exigirDosHoras (regla de cambios/cancelaciones).
 * @returns {Promise<string|null>} Mensaje de error listo para mostrar, o null si la cita es válida.
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

  // Barbero, horario del día y bloqueo se consultan juntos para no esperar tres veces.
  const [barbero, horario, bloqueo] = await Promise.all([
    Usuario.findOne({ _id: peluquero, rol: 'Barbero', activo: { $ne: false }, peluqueria_id: peluqueria }),
    Horario.findOne({ peluqueria, dia_semana: diaHorario(fecha), activo: true }),
    // Un bloqueo puede ser de día completo (hora: null) o de una hora puntual.
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

  // null = la cita pasa todas las validaciones.
  return null;
}

module.exports = { diaHorario, dosHorasAntes, horariosBase, inicioDelDia, reservasSolapadas, validarCita };

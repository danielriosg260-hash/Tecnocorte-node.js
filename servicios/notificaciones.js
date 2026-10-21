/**
 * Servicio de notificaciones de TecnoCorte.
 *
 * Maneja dos canales a la vez:
 *  - Notificaciones internas (colección `Notificacion`, se leen en el panel).
 *  - Correos electrónicos vía ./correo.
 *
 * Tipos de eventos que cubre:
 *  - Cuentas: bienvenida al crear una cuenta y aviso a admins de intento de
 *    acceso con cuenta suspendida.
 *  - Reservas: creación, confirmación, modificación y cancelación de citas
 *    (notifica al cliente y al barbero).
 *  - Suspensiones: avisa al cliente que su barbero quedó disponible y debe
 *    reprogramar la cita.
 *
 * Todas las funciones tragan los errores y solo los escriben en consola para
 * que un fallo de correo o de base de datos nunca rompa la operación principal.
 */
const Notificacion = require('../models/notificacion.model');
const Reserva = require('../models/reserva.model');
const Usuario = require('../models/usuario.model');
const { enviarCorreo, escapeHtml } = require('./correo');

// Texto base (tipo, título y mensaje) de cada notificación según el evento de la reserva.
const DATOS_EVENTO = {
  reservada: { tipo: 'reserva', titulo: 'Nueva cita', mensaje: 'Se ha creado una nueva cita.' },
  confirmada: { tipo: 'reserva', titulo: 'Cita confirmada', mensaje: 'La cita fue confirmada.' },
  modificada: { tipo: 'modificacion', titulo: 'Cita modificada', mensaje: 'La cita fue modificada.' },
  cancelada: { tipo: 'cancelacion', titulo: 'Cita cancelada', mensaje: 'La cita fue cancelada.' }
};

/**
 * Arma la URL base del sitio para los enlaces de los correos.
 * @returns {string} La APP_URL sin barra final, o '' si no está definida o no es http(s).
 */
function urlBase() {
  const valor = String(process.env.APP_URL || '').trim().replace(/\/$/, '');

  try {
    const url = new URL(valor);
    return ['http:', 'https:'].includes(url.protocol) ? valor : '';
  } catch {
    // Sin APP_URL o con una URL inválida: los correos salen sin botón de enlace.
    return '';
  }
}

/**
 * Crea la notificación de bienvenida y el correo cuando un admin crea una cuenta.
 * @param {object} usuario Usuario recién creado (usa _id, nombre y email).
 * @returns {Promise<void>} No lanza errores: solo los registra en consola.
 */
async function notificarCuentaCreada(usuario) {
  try {
    await Notificacion.create({
      usuario: usuario._id,
      tipo: 'sistema',
      titulo: 'Cuenta creada',
      mensaje: 'Tu cuenta de TecnoCorte está lista. Inicia sesión para continuar.'
    });

    const base = urlBase();

    await enviarCorreo({
      to: usuario.email,
      subject: 'Tu cuenta de TecnoCorte está lista',
      title: 'Bienvenido a TecnoCorte',
      preheader: 'Tu cuenta fue creada por el equipo de TecnoCorte.',
      greeting: `Hola ${usuario.nombre},`,
      content: '<p>Tu cuenta fue creada correctamente. Usa el correo registrado y la contraseña entregada por el administrador.</p>',
      action: base ? { label: 'Iniciar sesión', url: `${base}/login` } : null,
      text: 'Tu cuenta fue creada correctamente. Inicia sesión en TecnoCorte.'
    });
  } catch (error) {
    console.error('Error al notificar la cuenta creada:', error.message);
  }
}

/**
 * Avisa a los administradores cuando alguien intenta entrar con una cuenta suspendida.
 * @param {object} usuario Cuenta suspendida que intentó iniciar sesión (nombre, apellido).
 * @returns {Promise<void>} No hace nada si no hay administradores activos.
 */
async function avisarCuentaSuspendida(usuario) {
  try {
    const administradores = await Usuario.find({ rol: 'Admin', activo: { $ne: false } }).select('_id');
    if (!administradores.length) return;

    // Una sola consulta de inserción para no crear un documento por cada admin.
    await Notificacion.insertMany(
      administradores.map((admin) => ({
        usuario: admin._id,
        tipo: 'sistema',
        titulo: 'Intento de acceso de cuenta suspendida',
        mensaje: `${usuario.nombre} ${usuario.apellido} intentó iniciar sesión con una cuenta suspendida.`
      }))
    );
  } catch (error) {
    console.error('Error al avisar la suspensión:', error.message);
  }
}

/**
 * Crea las notificaciones internas del cliente y del barbero.
 * Si el evento no está en DATOS_EVENTO se usa un texto genérico de actualización.
 * @param {object} reserva Reserva con cliente y peluquero poblados (o solo con sus ids).
 * @param {string} evento Clave de DATOS_EVENTO: reservada, confirmada, modificada o cancelada.
 * @returns {Promise<void>}
 */
async function crearNotificacionesReserva(reserva, evento) {
  const datos = DATOS_EVENTO[evento] || {
    tipo: 'reserva',
    titulo: 'Actualización de cita',
    mensaje: 'Tu cita fue actualizada.'
  };

  const usuarios = [reserva.cliente, reserva.peluquero].filter(Boolean).map((usuario) => usuario._id || usuario);
  // Sin duplicados: evita avisar dos veces cuando el cliente y el barbero son la misma persona.
  const unicos = [...new Set(usuarios.map(String))];

  await Notificacion.insertMany(
    unicos.map((usuario) => ({ ...datos, usuario, reserva: reserva._id }))
  );
}

/**
 * Envía el correo y crea las notificaciones de una cita.
 * @param {string} reservaId Id de la reserva (se pobla cliente, peluquero y peluqueria).
 * @param {string} evento Evento de la reserva; se usa también en el asunto del correo.
 * @returns {Promise<void>} Sale sin enviar nada si la reserva ya no existe o no hay destinatarios.
 */
async function notificarReserva(reservaId, evento) {
  try {
    const reserva = await Reserva.findById(reservaId).populate('cliente peluquero peluqueria');
    if (!reserva) return;

    await crearNotificacionesReserva(reserva, evento);

    const base = urlBase();
    // Fecha en formato colombiano (ej: 20/10/2026) para el texto del correo.
    const fecha = new Date(reserva.fecha).toLocaleDateString('es-CO');
    const texto = `La cita de ${reserva.servicio || 'servicio'} para el ${fecha} a las ${reserva.hora} en ${reserva.peluqueria ? reserva.peluqueria.nombre : 'TecnoCorte'} fue ${evento.toLowerCase()}.`;

    // Cada destinatario recibe su propio enlace: el cliente edita la cita, el barbero abre su panel.
    const destinatarios = [
      reserva.cliente && reserva.cliente.email
        ? { to: reserva.cliente.email, url: base ? `${base}/editar-reserva/${reserva._id}` : '' }
        : null,
      reserva.peluquero && reserva.peluquero.email
        ? { to: reserva.peluquero.email, url: base ? `${base}/barbero` : '' }
        : null
    ].filter(Boolean);

    if (!destinatarios.length) return;

    // Los correos se envían en paralelo para no esperar uno tras otro.
    await Promise.all(
      destinatarios.map((destinatario) =>
        enviarCorreo({
          to: destinatario.to,
          subject: `TecnoCorte: ${evento} - ${reserva.servicio || 'cita'}`,
          title: `Cita ${evento}`,
          preheader: `Actualización de tu cita de ${reserva.servicio || 'servicio'}.`,
          greeting: 'Hola,',
          content: `<p>${escapeHtml(texto)}</p><p>Si necesitas modificarla, entra a tu panel de TecnoCorte.</p>`,
          // El botón cambia según a quién va el correo (editar cita vs. abrir panel).
          action: destinatario.url
            ? {
                label: destinatario.url.includes('/editar-reserva/') ? 'Modificar mi cita' : 'Abrir mi panel',
                url: destinatario.url
              }
            : null,
          text: texto
        })
      )
    );
  } catch (error) {
    console.error('Error al notificar la reserva:', error.message);
  }
}

/**
 * Avisa al cliente que su barbero fue suspendido y debe reprogramar.
 * Crea la notificación interna y envía el correo con el enlace para editar la cita.
 * @param {string} reservaId Id de la reserva afectada.
 * @returns {Promise<void>} No hace nada si la reserva no existe o no tiene cliente.
 */
async function notificarSuspension(reservaId) {
  try {
    const reserva = await Reserva.findById(reservaId).populate('cliente peluquero peluqueria');
    if (!reserva || !reserva.cliente) return;

    await Notificacion.create({
      usuario: reserva.cliente._id,
      reserva: reserva._id,
      tipo: 'suspension',
      titulo: 'Debes reprogramar tu cita',
      mensaje: 'Tu barbero ya no está disponible para esta cita.'
    });

    const base = urlBase();

    await enviarCorreo({
      to: reserva.cliente.email,
      subject: 'TecnoCorte: debes reprogramar tu cita',
      title: 'Debes reprogramar tu cita',
      preheader: 'Tu barbero ya no está disponible para esta cita.',
      greeting: `Hola ${reserva.cliente.nombre},`,
      content: `<p>El barbero ${escapeHtml(reserva.peluquero ? reserva.peluquero.nombre : '')} no está disponible para tu cita del ${new Date(reserva.fecha).toLocaleDateString('es-CO')} a las ${escapeHtml(reserva.hora)}.</p><p>Entra a tu perfil para modificarla y elegir otro barbero.</p>`,
      action: base ? { label: 'Reprogramar cita', url: `${base}/editar-reserva/${reserva._id}` } : null,
      text: 'Tu barbero ya no está disponible. Entra a tu perfil para reprogramar tu cita.'
    });
  } catch (error) {
    console.error('Error al avisar de la suspensión:', error.message);
  }
}

/** Avisa cuando una modificación de agenda obliga a buscar otro horario. */
async function notificarReprogramacion(reservaId, motivo = 'La agenda de la barbería cambió.') {
  try {
    const reserva = await Reserva.findById(reservaId).populate('cliente peluquero peluqueria');
    if (!reserva || !reserva.cliente) return;
    await Notificacion.create({
      usuario: reserva.cliente._id,
      reserva: reserva._id,
      tipo: 'modificacion',
      titulo: 'Debes reprogramar tu cita',
      mensaje: motivo
    });
    const base = urlBase();
    await enviarCorreo({
      to: reserva.cliente.email,
      subject: 'TecnoCorte: debes reprogramar tu cita',
      title: 'Debes reprogramar tu cita',
      preheader: motivo,
      greeting: `Hola ${reserva.cliente.nombre},`,
      content: `<p>${escapeHtml(motivo)}</p><p>Entra a tu perfil para escoger otro horario.</p>`,
      action: base ? { label: 'Reprogramar cita', url: `${base}/editar-reserva/${reserva._id}` } : null,
      text: motivo
    });
  } catch (error) {
    console.error('Error al avisar la reprogramación:', error.message);
  }
}

module.exports = {
  avisarCuentaSuspendida,
  crearNotificacionesReserva,
  notificarCuentaCreada,
  notificarReserva,
  notificarSuspension,
  notificarReprogramacion
};

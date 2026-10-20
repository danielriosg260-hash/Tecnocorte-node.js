const Notificacion = require('../models/notificacion.model');
const Reserva = require('../models/reserva.model');
const Usuario = require('../models/usuario.model');
const { enviarCorreo, escapeHtml } = require('./correo');

const DATOS_EVENTO = {
  reservada: { tipo: 'reserva', titulo: 'Nueva cita', mensaje: 'Se ha creado una nueva cita.' },
  confirmada: { tipo: 'reserva', titulo: 'Cita confirmada', mensaje: 'La cita fue confirmada.' },
  modificada: { tipo: 'modificacion', titulo: 'Cita modificada', mensaje: 'La cita fue modificada.' },
  cancelada: { tipo: 'cancelacion', titulo: 'Cita cancelada', mensaje: 'La cita fue cancelada.' }
};

/** Arma la URL base del sitio para los enlaces de los correos. */
function urlBase() {
  const valor = String(process.env.APP_URL || '').trim().replace(/\/$/, '');

  try {
    const url = new URL(valor);
    return ['http:', 'https:'].includes(url.protocol) ? valor : '';
  } catch {
    return '';
  }
}

/** Crea la notificación de bienvenida y el correo cuando un admin crea una cuenta. */
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

/** Avisa a los administradores cuando alguien intenta entrar con una cuenta suspendida. */
async function avisarCuentaSuspendida(usuario) {
  try {
    const administradores = await Usuario.find({ rol: 'Admin', activo: { $ne: false } }).select('_id');
    if (!administradores.length) return;

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

/** Crea las notificaciones internas del cliente y del barbero. */
async function crearNotificacionesReserva(reserva, evento) {
  const datos = DATOS_EVENTO[evento] || {
    tipo: 'reserva',
    titulo: 'Actualización de cita',
    mensaje: 'Tu cita fue actualizada.'
  };

  const usuarios = [reserva.cliente, reserva.peluquero].filter(Boolean).map((usuario) => usuario._id || usuario);
  const unicos = [...new Set(usuarios.map(String))];

  await Notificacion.insertMany(
    unicos.map((usuario) => ({ ...datos, usuario, reserva: reserva._id }))
  );
}

/** Envía el correo y crea las notificaciones de una cita. */
async function notificarReserva(reservaId, evento) {
  try {
    const reserva = await Reserva.findById(reservaId).populate('cliente peluquero peluqueria');
    if (!reserva) return;

    await crearNotificacionesReserva(reserva, evento);

    const base = urlBase();
    const fecha = new Date(reserva.fecha).toLocaleDateString('es-CO');
    const texto = `La cita de ${reserva.servicio || 'servicio'} para el ${fecha} a las ${reserva.hora} en ${reserva.peluqueria ? reserva.peluqueria.nombre : 'TecnoCorte'} fue ${evento.toLowerCase()}.`;

    const destinatarios = [
      reserva.cliente && reserva.cliente.email
        ? { to: reserva.cliente.email, url: base ? `${base}/editar-reserva/${reserva._id}` : '' }
        : null,
      reserva.peluquero && reserva.peluquero.email
        ? { to: reserva.peluquero.email, url: base ? `${base}/barbero` : '' }
        : null
    ].filter(Boolean);

    if (!destinatarios.length) return;

    await Promise.all(
      destinatarios.map((destinatario) =>
        enviarCorreo({
          to: destinatario.to,
          subject: `TecnoCorte: ${evento} - ${reserva.servicio || 'cita'}`,
          title: `Cita ${evento}`,
          preheader: `Actualización de tu cita de ${reserva.servicio || 'servicio'}.`,
          greeting: 'Hola,',
          content: `<p>${escapeHtml(texto)}</p><p>Si necesitas modificarla, entra a tu panel de TecnoCorte.</p>`,
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

/** Avisa al cliente que su barbero fue suspendido y debe reprogramar. */
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

module.exports = {
  avisarCuentaSuspendida,
  crearNotificacionesReserva,
  notificarCuentaCreada,
  notificarReserva,
  notificarSuspension
};

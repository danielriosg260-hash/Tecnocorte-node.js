/**
 * Autenticación de los usuarios del sitio: registro, inicio de sesión,
 * verificación de correo y recuperación de contraseña.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Usuario = require('../models/usuario.model');
const Ingreso = require('../models/ingreso.model');
const Notificacion = require('../models/notificacion.model');
const Configuracion = require('../models/configuracion.model');
const { cerrarSesion, guardarSesion } = require('../config/session');
const {
  enviarCodigoVerificacion,
  enviarCorreo,
  guardarCodigo,
  verificarCodigo
} = require('../servicios/correo');
const { avisarCuentaSuspendida } = require('../servicios/notificaciones');
const { mensajeError, normalizarEmail, panelDe, urlSegura } = require('../utils/objetos');

/** Crea el token JWT que se guarda en la cookie de sesión. */
function generarToken(id, tokenVersion) {
  return jwt.sign({ id, tokenVersion: tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}

/** Mantiene el inicio público del cliente y los paneles de staff. */
function destinoTrasAcceso(usuario, siguiente) {
  const destino = urlSegura(siguiente || '');
  if (destino !== '/') return destino;
  return usuario && usuario.rol === 'Cliente' ? '/' : panelDe(usuario);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/** Dibuja el formulario de ingreso con el error y el destino pendientes. */
function mostrarLogin(req, res, error = '') {
  return res.render('publicos/login', {
    layout: false,
    error,
    proximo: urlSegura(req.body.next || req.query.next || ''),
    valores: req.method === 'POST' ? req.body : {}
  });
}

/** Revisa credenciales, estados de la cuenta y abre la sesión del navegador. */
async function iniciarSesion(req, res) {
  try {
    const email = normalizarEmail(req.body.user || req.body.email);
    const password = req.body.password;

    if (!email || typeof password !== 'string' || !password) {
      return mostrarLogin(req, res, 'Ingresa correo y contraseña.');
    }

    const usuario = await Usuario.findOne({ email }).select('+password +tokenVersion');

    if (!usuario || !(await usuario.compararPassword(password))) {
      return mostrarLogin(req, res, 'Correo o contraseña incorrectos.');
    }

    if (usuario.activo === false) {
      // El aviso salta en segundo plano para no demorar la respuesta del login.
      await avisarCuentaSuspendida(usuario);
      return mostrarLogin(req, res, 'Tu cuenta está suspendida. Contacta al administrador.');
    }

    if (usuario.email_verificado === false) {
      return mostrarLogin(req, res, 'Verifica tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
    }

    // Se guarda el JWT en la cookie y se anota el ingreso para auditoría.
    guardarSesion(res, generarToken(usuario._id, usuario.tokenVersion));
    await Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });

    // "next" solo se sigue si es un destino seguro; si no, se respeta el inicio del rol.
    return res.redirect(destinoTrasAcceso(usuario, req.body.next || req.query.next));
  } catch (error) {
    console.error('Error en el login:', error.message);
    return mostrarLogin(req, res, 'No se pudo iniciar sesión.');
  }
}

/** Borra la cookie de sesión y regresa al inicio. */
function salir(req, res) {
  cerrarSesion(res);
  return res.redirect('/');
}

// ---------------------------------------------------------------------------
// Registro y verificación de correo
// ---------------------------------------------------------------------------

/** Pinta el formulario de registro, marcándolo cerrado si la config lo impide. */
async function mostrarRegistro(req, res) {
  const config = await Configuracion.cargar();

  return res.render('publicos/registro', {
    layout: false,
    proximo: req.query.next || '',
    error: '',
    valores: {},
    registro_cerrado: !config.registro_abierto,
    form_post: ''
  });
}

/** Crea la cuenta activa y abre la sesión sin depender del correo. */
async function registrar(req, res) {
  const datos = req.body;
  const email = normalizarEmail(datos.email);
  const config = await Configuracion.cargar();

  // Repite el formulario con lo que el usuario ya escribió y el motivo del error.
  const volverAlFormulario = (mensaje) =>
    res.status(400).render('publicos/registro', {
      layout: false,
      proximo: datos.next || '',
      error: mensaje,
      valores: datos,
      registro_cerrado: false,
      form_post: new URLSearchParams(datos).toString()
    });

  // Registro desactivado desde la configuración del panel.
  if (!config.registro_abierto) {
    return res.status(403).render('publicos/registro', {
      layout: false,
      proximo: '',
      error: '',
      valores: {},
      registro_cerrado: true,
      form_post: ''
    });
  }

  if (!datos.nombre || !datos.apellido || !email || typeof datos.password !== 'string' || datos.password.length < 8) {
    return volverAlFormulario('Completa los datos y usa una contraseña de al menos 8 caracteres.');
  }

  try {
    const usuario = await Usuario.create({
      nombre: datos.nombre,
      apellido: datos.apellido,
      email,
      password: datos.password,
      telefono: datos.telefono,
      email_verificado: true
    });

    // El registro no depende de SMTP: la sesión se abre inmediatamente.
    guardarSesion(res, generarToken(usuario._id, usuario.tokenVersion));
    return res.redirect(destinoTrasAcceso(usuario, datos.next));
  } catch (error) {
    return volverAlFormulario(mensajeError(error));
  }
}

/** Pide el código de 6 dígitos que llegó al correo. */
function mostrarVerificacion(req, res, error = '', enviado = false) {
  return res.render('publicos/verificar_email', {
    layout: false,
    email: req.body.email || req.query.email || '',
    next: req.body.next || req.query.next || '',
    error,
    enviado
  });
}

/** Comprueba el código, activa la cuenta y deja al usuario dentro. */
async function verificarEmail(req, res) {
  const email = normalizarEmail(req.body.email || req.query.email);
  const codigo = String(req.body.codigo || '').trim();
  const next = urlSegura(req.body.next || req.query.next || '');

  const usuario = await Usuario.findOne({ email }).select(
    '+email_verificacion_token +email_verificacion_expira +tokenVersion'
  );

  // Debe ser un código de 6 dígitos que siga vigente y coincida con el guardado.
  if (!usuario || !/^\d{6}$/.test(codigo) || !verificarCodigo(usuario, codigo)) {
    return res.status(400).render('publicos/verificar_email', {
      layout: false,
      email,
      next,
      error: 'El código no es válido o ya expiró.',
      enviado: false
    });
  }

  // Se activa la cuenta y se borra el código para que no se pueda repetir.
  usuario.email_verificado = true;
  usuario.email_verificacion_token = undefined;
  usuario.email_verificacion_expira = undefined;
  await usuario.save();

  await Notificacion.create({
    usuario: usuario._id,
    tipo: 'sistema',
    titulo: 'Cuenta activada',
    mensaje: 'Tu cuenta de TecnoCorte fue verificada correctamente.'
  });

  // Cuenta confirmada: se abre sesión y se sigue en "next" o en el panel del rol.
  guardarSesion(res, generarToken(usuario._id, usuario.tokenVersion));
  return res.redirect(destinoTrasAcceso(usuario, next));
}

/** Manda de nuevo el código; responde igual aunque el correo no exista. */
async function reenviarVerificacion(req, res) {
  const email = normalizarEmail(req.body.email || req.query.email);
  const next = urlSegura(req.body.next || req.query.next || '');
  const usuario = await Usuario.findOne({ email });

  // Solo se reenvía a cuentas aún sin verificar; el resto no recibe correo.
  if (usuario && usuario.email_verificado === false) {
    const codigo = await guardarCodigo(usuario);
    await enviarCodigoVerificacion(usuario, codigo);
  }

  return res.render('publicos/verificar_email', {
    layout: false,
    email,
    next,
    enviado: true,
    error: ''
  });
}

// ---------------------------------------------------------------------------
// Recuperación de contraseña
// ---------------------------------------------------------------------------

/** Pinta el formulario para pedir el enlace de recuperación. */
function mostrarRecuperar(req, res, error = '', enviado = false) {
  return res.render('publicos/recuperar_password', {
    title: 'Recuperar contraseña - TecnoCorte',
    error,
    enviado
  });
}

/** Guarda el token de recuperación y envía el enlace por correo. */
async function solicitarRecuperacion(req, res) {
  const email = normalizarEmail(req.body.email);

  if (email) {
    const usuario = await Usuario.findOne({ email });

    if (usuario) {
      // En la base solo se guarda el hash y con vigencia de una hora;
      // el token tal cual solo viaja dentro del correo enviado.
      const token = crypto.randomBytes(32).toString('hex');
      usuario.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
      usuario.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await usuario.save();

      const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      await enviarCorreo({
        to: usuario.email,
        subject: 'Restablece tu contraseña de TecnoCorte',
        title: 'Restablece tu contraseña',
        preheader: 'Tu enlace de recuperación vence en una hora.',
        greeting: `Hola ${usuario.nombre},`,
        content:
          '<p>Solicitaste cambiar tu contraseña de TecnoCorte.</p><p>Usa el botón para crear una nueva contraseña. Por seguridad, el enlace vence en una hora.</p>',
        action: { label: 'Restablecer contraseña', url: `${base}/restablecer-password/${token}` },
        text: 'Solicitaste cambiar tu contraseña. Este enlace vence en una hora.'
      });
    }
  }

  // Siempre se muestra "enviado" para no revelar si el correo está registrado.
  return res.render('publicos/recuperar_password', {
    title: 'Recuperar contraseña - TecnoCorte',
    enviado: true,
    error: ''
  });
}

/** Busca al usuario con un token de recuperación válido y aún no expirado. */
async function buscarPorToken(token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  return Usuario.findOne({
    resetPasswordToken: hash,
    resetPasswordExpires: { $gt: new Date() }
  });
}

/** Muestra el formulario de la nueva contraseña, avisando si el enlace ya no sirve. */
async function mostrarRestablecer(req, res, error = '') {
  const usuario = await buscarPorToken(req.params.token);

  return res.render('publicos/restablecer_password', {
    title: 'Cambiar contraseña - TecnoCorte',
    token: req.params.token,
    valido: Boolean(usuario),
    error
  });
}

/** Valida el enlace y las contraseñas, y guarda la nueva contraseña. */
async function restablecerPassword(req, res) {
  const usuario = await buscarPorToken(req.params.token);
  const { password, password_confirm } = req.body;

  if (!usuario) {
    return mostrarRestablecer(req, res, 'El enlace no es válido o ya expiró.');
  }

  if (password !== password_confirm || typeof password !== 'string' || password.length < 8) {
    return res.status(400).render('publicos/restablecer_password', {
      title: 'Cambiar contraseña - TecnoCorte',
      token: req.params.token,
      valido: true,
      error: 'Las contraseñas deben coincidir y tener al menos 8 caracteres.'
    });
  }

  // El modelo la hashea al guardar y el enlace queda anulado: solo sirve una vez.
  usuario.password = password;
  usuario.resetPasswordToken = undefined;
  usuario.resetPasswordExpires = undefined;
  await usuario.save();

  return res.redirect('/login');
}

module.exports = {
  buscarPorToken,
  generarToken,
  iniciarSesion,
  mostrarLogin,
  mostrarRecuperar,
  mostrarRegistro,
  mostrarRestablecer,
  mostrarVerificacion,
  reenviarVerificacion,
  registrar,
  restablecerPassword,
  salir,
  solicitarRecuperacion,
  verificarEmail
};

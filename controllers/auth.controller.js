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
} = require('../services/correo');
const { avisarCuentaSuspendida } = require('../services/notificaciones');
const { mensajeError, normalizarEmail, panelDe, urlSegura } = require('../utils/objetos');

/** Crea el token JWT que se guarda en la cookie de sesión. */
function generarToken(id, tokenVersion) {
  return jwt.sign({ id, tokenVersion: tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function mostrarLogin(req, res, error = '') {
  return res.render('publicos/login', {
    layout: false,
    error,
    proximo: urlSegura(req.body.next || req.query.next || ''),
    valores: req.method === 'POST' ? req.body : {}
  });
}

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
      void avisarCuentaSuspendida(usuario);
      return mostrarLogin(req, res, 'Tu cuenta está suspendida. Contacta al administrador.');
    }

    if (usuario.email_verificado === false) {
      return mostrarLogin(req, res, 'Verifica tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
    }

    guardarSesion(res, generarToken(usuario._id, usuario.tokenVersion));
    await Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });

    const destino = req.body.next || req.query.next;
    return res.redirect(destino ? urlSegura(destino) : panelDe(usuario));
  } catch (error) {
    console.error('Error en el login:', error.message);
    return mostrarLogin(req, res, 'No se pudo iniciar sesión.');
  }
}

function salir(req, res) {
  cerrarSesion(res);
  return res.redirect('/');
}

// ---------------------------------------------------------------------------
// Registro y verificación de correo
// ---------------------------------------------------------------------------

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

async function registrar(req, res) {
  const datos = req.body;
  const email = normalizarEmail(datos.email);
  const config = await Configuracion.cargar();

  const volverAlFormulario = (mensaje) =>
    res.status(400).render('publicos/registro', {
      layout: false,
      proximo: datos.next || '',
      error: mensaje,
      valores: datos,
      registro_cerrado: false,
      form_post: new URLSearchParams(datos).toString()
    });

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
      email_verificado: false
    });

    const codigo = await guardarCodigo(usuario);
    await enviarCodigoVerificacion(usuario, codigo);

    return res.redirect(
      `/verificar-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(datos.next || '')}`
    );
  } catch (error) {
    return volverAlFormulario(mensajeError(error));
  }
}

function mostrarVerificacion(req, res, error = '', enviado = false) {
  return res.render('publicos/verificar_email', {
    layout: false,
    email: req.body.email || req.query.email || '',
    next: req.body.next || req.query.next || '',
    error,
    enviado
  });
}

async function verificarEmail(req, res) {
  const email = normalizarEmail(req.body.email || req.query.email);
  const codigo = String(req.body.codigo || '').trim();
  const next = urlSegura(req.body.next || req.query.next || '');

  const usuario = await Usuario.findOne({ email }).select(
    '+email_verificacion_token +email_verificacion_expira +tokenVersion'
  );

  if (!usuario || !/^\d{6}$/.test(codigo) || !verificarCodigo(usuario, codigo)) {
    return res.status(400).render('publicos/verificar_email', {
      layout: false,
      email,
      next,
      error: 'El código no es válido o ya expiró.',
      enviado: false
    });
  }

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

  guardarSesion(res, generarToken(usuario._id, usuario.tokenVersion));
  return res.redirect(next !== '/' ? next : panelDe(usuario));
}

async function reenviarVerificacion(req, res) {
  const email = normalizarEmail(req.body.email || req.query.email);
  const next = urlSegura(req.body.next || req.query.next || '');
  const usuario = await Usuario.findOne({ email });

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

function mostrarRecuperar(req, res, error = '', enviado = false) {
  return res.render('publicos/recuperar_password', {
    title: 'Recuperar contraseña - TecnoCorte',
    error,
    enviado
  });
}

async function solicitarRecuperacion(req, res) {
  const email = normalizarEmail(req.body.email);

  if (email) {
    const usuario = await Usuario.findOne({ email });

    if (usuario) {
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

  return res.render('publicos/recuperar_password', {
    title: 'Recuperar contraseña - TecnoCorte',
    enviado: true,
    error: ''
  });
}

async function buscarPorToken(token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  return Usuario.findOne({
    resetPasswordToken: hash,
    resetPasswordExpires: { $gt: new Date() }
  });
}

async function mostrarRestablecer(req, res, error = '') {
  const usuario = await buscarPorToken(req.params.token);

  return res.render('publicos/restablecer_password', {
    title: 'Cambiar contraseña - TecnoCorte',
    token: req.params.token,
    valido: Boolean(usuario),
    error
  });
}

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

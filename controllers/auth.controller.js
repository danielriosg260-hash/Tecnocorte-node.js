const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const Notificacion = require('../models/notificacion.model');
const Ingreso = require('../models/ingreso.model');
const transporter = require('../config/email');
const { enviarCorreoBonito } = require('../config/emailtemplate');
const { guardarCodigo, verificarCodigo } = require('../config/emailverification');
const { clearSessionCookie, setSessionCookie } = require('../config/session');

const HASH_FALSO = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.VbZV5hQ9Qf6yUQxV0n5h8z0fP1w8W8K';

function emailLimpio(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function generarToken(id, tokenVersion) {
  return jwt.sign({ id: id, tokenVersion: tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}

function datosPublicos(usuario) {
  return {
    id: usuario._id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
    email_verificado: usuario.email_verificado !== false
  };
}

async function registro(req, res) {
  try {
    const nombre = req.body.nombre;
    const apellido = req.body.apellido;
    const password = req.body.password;
    const telefono = req.body.telefono;
    const email = emailLimpio(req.body.email);

    if (typeof nombre !== 'string' || typeof apellido !== 'string' || !email) {
      return res.status(400).json({ mensaje: 'Revisa los datos ingresados.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener entre 8 y 128 caracteres.' });
    }

    const existe = await Usuario.findOne({ email: email });
    if (existe) return res.status(400).json({ mensaje: 'El correo ya está registrado' });

    const usuario = await Usuario.create({ nombre, apellido, email, password, telefono, email_verificado: false });
    const codigo = await guardarCodigo(usuario);

    await enviarCorreoBonito(transporter, {
      to: email,
      subject: 'Verifica tu correo de TecnoCorte',
      title: 'Verifica tu correo',
      preheader: 'Tu código de verificación vence en 15 minutos.',
      greeting: `¡Hola ${nombre}!`,
      content: `<p>Tu cuenta fue creada. Usa este código para activarla:</p><p><strong style="font-size:28px">${codigo}</strong></p><p>El código vence en 15 minutos.</p>`,
      text: `Tu código de verificación es ${codigo}. Vence en 15 minutos.`
    }).catch(function (error) {
      console.error('Error al enviar correo:', error.message);
    });

    return res.status(201).json({ mensaje: 'Cuenta creada. Revisa tu correo para verificarla.', verificacion_requerida: true, usuario: datosPublicos(usuario) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    return res.status(400).json({ mensaje: 'No se pudo completar el registro' });
  }
}

async function login(req, res) {
  try {
    const email = emailLimpio(req.body.email || req.body.user);
    const password = req.body.password;

    if (!email || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ mensaje: 'Ingresa correo y contraseña' });
    }

    const usuario = await Usuario.findOne({ email: email }).select('+password +tokenVersion');

    let valida = false;
    if (usuario) {
      valida = await usuario.compararPassword(password);
    } else {
      valida = await bcrypt.compare(password, HASH_FALSO);
    }

    if (!usuario || !valida) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }
    if (usuario.activo === false) {
      return res.status(403).json({ mensaje: 'Tu cuenta está suspendida. Contacta al administrador.' });
    }
    if (usuario.email_verificado === false) {
      return res.status(403).json({ mensaje: 'Verifica tu correo antes de iniciar sesión.', verificacion_requerida: true, email: usuario.email });
    }

    const token = generarToken(usuario._id, usuario.tokenVersion);
    setSessionCookie(res, token);
    await Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });

    return res.status(200).json({ mensaje: 'Inicio de sesión exitoso', usuario: datosPublicos(usuario) });
  } catch (error) {
    return res.status(500).json({ mensaje: 'No se pudo iniciar sesión' });
  }
}

async function verificarEmail(req, res) {
  const email = emailLimpio(req.body.email);
  const codigo = String(req.body.codigo || '').trim();

  const usuario = await Usuario.findOne({ email: email }).select('+email_verificacion_token +email_verificacion_expira +tokenVersion');
  const codigoOk = /^\d{6}$/.test(codigo) && usuario && verificarCodigo(usuario, codigo);
  if (!usuario || !codigoOk) {
    return res.status(400).json({ mensaje: 'El código no es válido o ya expiró.' });
  }

  usuario.email_verificado = true;
  usuario.email_verificacion_token = undefined;
  usuario.email_verificacion_expira = undefined;
  await usuario.save();

  const token = generarToken(usuario._id, usuario.tokenVersion);
  setSessionCookie(res, token);
  return res.status(200).json({ mensaje: 'Correo verificado correctamente.', usuario: datosPublicos(usuario) });
}

function logout(req, res) {
  clearSessionCookie(res);
  res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
}

function perfil(req, res) {
  res.status(200).json({ usuario: req.usuario });
}

module.exports = {
  datosPublicos,
  generarToken,
  login,
  logout,
  normalizarEmail: emailLimpio,
  perfil,
  registro,
  verificarEmail
};

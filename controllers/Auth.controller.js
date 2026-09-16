const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');
const Ingreso = require('../models/Ingreso.model');
const transporter = require('../config/email');
const { enviarCorreoBonito } = require('../config/emailTemplate');
const { guardarCodigo, verificarCodigo } = require('../config/emailVerification');
const { clearSessionCookie, setSessionCookie } = require('../config/session');

const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.VbZV5hQ9Qf6yUQxV0n5h8z0fP1w8W8K';

const escaparHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const normalizarEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : '';

const generarToken = (id, tokenVersion = 0) => jwt.sign(
  { id, tokenVersion },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

const datosPublicos = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol,
  activo: usuario.activo,
  email_verificado: usuario.email_verificado !== false
});

const enviarCorreo = (opciones) => enviarCorreoBonito(transporter, opciones).catch((error) => {
  console.error('Error al enviar correo:', error.message);
});

const registro = async (req, res) => {
  try {
    const { nombre, apellido, password, telefono } = req.body;
    const email = normalizarEmail(req.body.email);

    if (typeof nombre !== 'string' || typeof apellido !== 'string' || !email || email.length > 254 ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ mensaje: 'Revisa los datos. La contraseña debe tener entre 8 y 128 caracteres.' });
    }

    const existe = await Usuario.findOne({ email });
    if (existe) return res.status(400).json({ mensaje: 'El correo ya está registrado' });

    const usuario = await Usuario.create({ nombre, apellido, email, password, telefono, email_verificado: false });
    const codigo = await guardarCodigo(usuario);

    void enviarCorreo({
      to: email,
      subject: 'Verifica tu correo de TecnoCorte',
      title: 'Verifica tu correo',
      preheader: 'Tu código de verificación vence en 15 minutos.',
      greeting: `¡Hola ${nombre}!`,
      content: `<p>Tu cuenta ha sido creada. Usa este código para activarla:</p><div style="margin:26px 0;padding:18px;text-align:center;background:#f3ead6;border:1px solid #d6ad42;border-radius:12px"><strong style="color:#6d5314;font-size:34px;letter-spacing:8px">${codigo}</strong></div><p>El código vence en 15 minutos.</p>`,
      text: `Tu código de verificación es ${codigo}. Vence en 15 minutos.`
    });

    return res.status(201).json({ mensaje: 'Cuenta creada. Revisa tu correo para verificarla.', verificacion_requerida: true, usuario: datosPublicos(usuario) });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    return res.status(400).json({ mensaje: 'No se pudo completar el registro' });
  }
};

const login = async (req, res) => {
  try {
    const email = normalizarEmail(req.body.email || req.body.user);
    const password = req.body.password;

    if (!email || email.length > 254 || typeof password !== 'string' || password.length === 0 || password.length > 128) {
      return res.status(400).json({ mensaje: 'Ingresa correo y contraseña' });
    }

    const usuario = await Usuario.findOne({ email }).select('+password +tokenVersion');
    const valida = usuario
      ? await usuario.compararPassword(password)
      : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

    if (!usuario || !valida || usuario.activo === false) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }
    if (usuario.email_verificado === false) return res.status(403).json({ mensaje: 'Verifica tu correo antes de iniciar sesión.', verificacion_requerida: true, email: usuario.email });

    const token = generarToken(usuario._id, usuario.tokenVersion || 0);
    setSessionCookie(res, token);
    void Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });

    void enviarCorreo({
      to: email,
      subject: 'Inicio de sesión en tu cuenta',
      title: 'Inicio de sesión confirmado',
      preheader: 'Se detectó un nuevo inicio de sesión.',
      greeting: `Hola ${usuario.nombre},`,
      content: `<p>Se ha detectado un inicio de sesión en tu cuenta de TecnoCorte.</p><p><strong>Fecha:</strong> ${escaparHtml(new Date().toLocaleString('es-CO'))}</p>`,
      text: 'Se ha detectado un inicio de sesión en tu cuenta.'
    });

    return res.status(200).json({ mensaje: 'Inicio de sesión exitoso', usuario: datosPublicos(usuario) });
  } catch {
    return res.status(500).json({ mensaje: 'No se pudo iniciar sesión' });
  }
};

const verificarEmail = async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const codigo = String(req.body.codigo || '').trim();
  const usuario = await Usuario.findOne({ email }).select('+email_verificacion_token +email_verificacion_expira +tokenVersion');
  if (!usuario || !/^\d{6}$/.test(codigo) || !verificarCodigo(usuario, codigo)) return res.status(400).json({ mensaje: 'El código no es válido o ya expiró.' });
  usuario.email_verificado = true;
  usuario.email_verificacion_token = undefined;
  usuario.email_verificacion_expira = undefined;
  await usuario.save();
  const token = generarToken(usuario._id, usuario.tokenVersion || 0);
  setSessionCookie(res, token);
  return res.status(200).json({ mensaje: 'Correo verificado correctamente.', usuario: datosPublicos(usuario) });
};

const logout = (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
};

const perfil = async (req, res) => res.status(200).json({ usuario: req.usuario });

module.exports = { datosPublicos, generarToken, login, logout, normalizarEmail, perfil, registro, verificarEmail };

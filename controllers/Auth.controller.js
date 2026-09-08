const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');
const Ingreso = require('../models/Ingreso.model');
const transporter = require('../config/email');
const { clearSessionCookie, setSessionCookie } = require('../config/session');

const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.VbZV5hQ9Qf6yUQxV0n5h8z0fP1w8W8K';

const escaparHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const normalizarEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : '';

const generarToken = (id) => jwt.sign(
  { id },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
);

const datosPublicos = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  rol: usuario.rol,
  activo: usuario.activo
});

const enviarCorreo = (opciones) => transporter.sendMail(opciones).catch((error) => {
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

    const usuario = await Usuario.create({ nombre, apellido, email, password, telefono });
    const token = generarToken(usuario._id);
    setSessionCookie(res, token);

    void enviarCorreo({
      from: `"TecnoCorte" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '¡Bienvenido a TecnoCorte!',
      html: `<h1>¡Hola ${escaparHtml(nombre)}!</h1><p>Tu cuenta ha sido creada exitosamente.</p><p><strong>Correo:</strong> ${escaparHtml(email)}</p>`
    });

    return res.status(201).json({ mensaje: 'Usuario registrado correctamente', token, usuario: datosPublicos(usuario) });
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

    const usuario = await Usuario.findOne({ email }).select('+password');
    const valida = usuario
      ? await usuario.compararPassword(password)
      : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

    if (!usuario || !valida || usuario.activo === false) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    const token = generarToken(usuario._id);
    setSessionCookie(res, token);
    void Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });

    void enviarCorreo({
      from: `"TecnoCorte" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Inicio de sesión en tu cuenta',
      html: `<h1>Hola ${escaparHtml(usuario.nombre)}</h1><p>Se ha detectado un inicio de sesión en tu cuenta de TecnoCorte.</p><p><strong>Fecha:</strong> ${escaparHtml(new Date().toLocaleString('es-CO'))}</p>`
    });

    return res.status(200).json({ mensaje: 'Inicio de sesión exitoso', token, usuario: datosPublicos(usuario) });
  } catch {
    return res.status(500).json({ mensaje: 'No se pudo iniciar sesión' });
  }
};

const logout = (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
};

const perfil = async (req, res) => res.status(200).json({ usuario: req.usuario });

module.exports = { datosPublicos, generarToken, login, logout, normalizarEmail, perfil, registro };

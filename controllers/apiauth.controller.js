const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const Ingreso = require('../models/ingreso.model');
const { normalizarEmail } = require('../utils/objetos');

/** Crea el token JWT que se devuelve a los clientes de la API. */
function generarToken(id, tokenVersion) {
  return jwt.sign({ id, tokenVersion: tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}

/** Inicia sesión y devuelve el token en JSON. */
async function login(req, res) {
  try {
    const email = normalizarEmail(req.body.email || req.body.user);
    const password = req.body.password;

    if (!email || !password) return res.status(400).json({ mensaje: 'Ingresa correo y contraseña.' });

    const usuario = await Usuario.findOne({ email }).select('+password +tokenVersion');

    if (!usuario || !(await usuario.compararPassword(password))) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
    }

    if (usuario.activo === false) {
      return res.status(403).json({ mensaje: 'Tu cuenta está suspendida.' });
    }

    await Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });

    return res.status(200).json({
      token: generarToken(usuario._id, usuario.tokenVersion),
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    return res.status(500).json({ mensaje: 'No se pudo iniciar sesión.' });
  }
}

/** Registra un cliente desde la API. */
async function registro(req, res) {
  try {
    const { nombre, apellido, password, telefono } = req.body;
    const email = normalizarEmail(req.body.email);

    if (!nombre || !apellido || !email || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ mensaje: 'Completa los datos y usa una contraseña de al menos 8 caracteres.' });
    }

    const usuario = await Usuario.create({ nombre, apellido, email, password, telefono });

    return res.status(201).json({
      token: generarToken(usuario._id, usuario.tokenVersion),
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    const mensaje = error.code === 11000 ? 'El correo ya está registrado.' : 'No se pudo crear la cuenta.';
    return res.status(400).json({ mensaje });
  }
}

/** Devuelve el usuario dueño del token. */
function perfil(req, res) {
  return res.status(200).json({
    id: req.usuario._id,
    nombre: req.usuario.nombre,
    apellido: req.usuario.apellido,
    email: req.usuario.email,
    telefono: req.usuario.telefono,
    rol: req.usuario.rol
  });
}

/** Cierra la sesión de la API. */
function logout(req, res) {
  return res.status(200).json({ mensaje: 'Sesión cerrada correctamente.' });
}

module.exports = { generarToken, login, logout, perfil, registro };

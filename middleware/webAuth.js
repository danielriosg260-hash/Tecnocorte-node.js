const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');
const { getSessionToken, readCart } = require('../config/session');

const cargarSesion = async (req, res, next) => {
  req.usuario = null;
  res.locals.logueado = null;
  res.locals.usuario = null;
  res.locals.usuario_actual = { foto: '' };
  res.locals.rol = '';
  res.locals.cantidad = readCart(req).reduce((total, item) => total + (Number(item.cantidad) || 0), 0);

  const token = getSessionToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (usuario && usuario.activo !== false) {
      req.usuario = usuario;
      res.locals.logueado = usuario;
      res.locals.usuario = usuario;
      res.locals.usuario_actual = usuario;
      res.locals.rol = usuario.rol || '';
    }
  } catch {
    // A stale browser cookie behaves like an anonymous request.
  }
  next();
};

const exigirSesion = (req, res, next) => {
  if (req.usuario) return next();
  const nextUrl = `${req.path}${req.url.includes('?') ? `?${req.url.split('?')[1]}` : ''}`;
  return res.redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
};

const exigirRol = (...roles) => (req, res, next) => {
  if (!req.usuario) return exigirSesion(req, res, next);
  if (!roles.includes(req.usuario.rol)) return res.status(403).send('No tienes permisos para acceder a esta página.');
  next();
};

module.exports = { cargarSesion, exigirRol, exigirSesion };

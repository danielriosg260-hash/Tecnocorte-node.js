const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const { obtenerToken } = require('../config/session');

/**
 * Verifica el token JWT en las rutas de la API.
 * Si el token no sirve responde 401 en formato JSON.
 */
async function verificarToken(req, res, next) {
  const token = obtenerToken(req);

  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(datos.id).select('+tokenVersion');
    const tokenVigente = (datos.tokenVersion || 0) === (usuario ? usuario.tokenVersion || 0 : -1);

    if (!usuario || usuario.activo === false || !tokenVigente) {
      return res.status(401).json({ mensaje: 'Token inválido o usuario inactivo' });
    }

    req.usuario = usuario;
    next();
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

module.exports = verificarToken;

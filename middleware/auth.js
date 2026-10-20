/**
 * Autenticación de la API por token JWT.
 * El token se lee de la cookie o de la cabecera Authorization y se valida
 * contra la base antes de dejar pasar la petición.
 */
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const { obtenerToken } = require('../config/session');

/**
 * Verifica el token JWT en las rutas de la API.
 * Si el token no sirve responde 401 en formato JSON.
 * Deja pasar cuando el token es válido, la cuenta está activa y la
 * tokenVersion coincide (si no, la contraseña cambió y el token caducó).
 */
async function verificarToken(req, res, next) {
  const token = obtenerToken(req);

  // Sin token no hay nada que comprobar: 401 de inmediato.
  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(datos.id).select('+tokenVersion');
    // Compara la versión del token con la del usuario guardado.
    const tokenVigente = (datos.tokenVersion || 0) === (usuario ? usuario.tokenVersion || 0 : -1);

    if (!usuario || usuario.activo === false || !tokenVigente) {
      return res.status(401).json({ mensaje: 'Token inválido o usuario inactivo' });
    }

    // Usuario validado: se deja disponible para los controladores.
    req.usuario = usuario;
    next();
  } catch {
    // Firma incorrecta o token expirado.
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

module.exports = verificarToken;

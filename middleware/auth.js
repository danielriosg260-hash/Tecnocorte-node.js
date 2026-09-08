const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');
const { getSessionToken } = require('../config/session');

const verificarToken = async (req, res, next) => {
  const token = getSessionToken(req);

  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado' });
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

module.exports = verificarToken;

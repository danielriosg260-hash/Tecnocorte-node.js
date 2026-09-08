const exigirRolApi = (...roles) => (req, res, next) => {
  if (!req.usuario || !roles.includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
  next();
};

module.exports = exigirRolApi;

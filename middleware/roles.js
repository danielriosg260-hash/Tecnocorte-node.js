/**
 * Control de roles para la API JSON.
 * A diferencia del de sesiones (middleware/sesion), aquí no redirige:
 * responde 403 en JSON cuando el rol no está permitido.
 */

/**
 * Devuelve un middleware que deja pasar solo si req.usuario existe y su rol
 * figura entre los roles indicados. Si no, responde 403 con mensaje JSON.
 * Uso: exigirRol('Admin') o exigirRol('Admin', 'Barbero').
 */
const exigirRolApi = (...roles) => (req, res, next) => {
  // Sin usuario o con otro rol: permiso denegado.
  if (!req.usuario || !roles.includes(req.usuario.rol)) return res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
  next();
};

module.exports = exigirRolApi;

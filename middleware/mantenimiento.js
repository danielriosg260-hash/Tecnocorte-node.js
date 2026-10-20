const Configuracion = require('../models/configuracion.model');
const log = require('../services/log');

// Rutas que siguen abiertas aunque el sitio esté en mantenimiento.
const PREFIJOS_PERMITIDOS = ['/login', '/logout', '/admin', '/css', '/js', '/images', '/uploads', '/api/'];

/**
 * Si el Admin activa el modo mantenimiento, los visitantes ven la página de
 * aviso y el Admin puede seguir entrando a arreglar el sitio.
 */
async function mantenimiento(req, res, next) {
  // Los archivos y las rutas permitidas no necesitan consultar la base.
  if (PREFIJOS_PERMITIDOS.some((prefijo) => req.path.startsWith(prefijo))) return next();

  let config;
  try {
    config = await Configuracion.cargar();
  } catch (error) {
    // Si la base de datos no responde, no se bloquea el sitio por esta causa.
    log.escribir(`ERROR al revisar el mantenimiento: ${error.message}`);
    return next();
  }

  if (!config.modo_mantenimiento) return next();
  if (req.usuario && req.usuario.rol === 'Admin') return next();

  res.status(503);
  return res.render('publicos/mantenimiento', {
    title: 'Mantenimiento',
    bodyClass: 'bg-background text-on-surface',
    config
  });
}

module.exports = mantenimiento;

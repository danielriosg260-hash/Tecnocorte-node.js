const Configuracion = require('../models/configuracion.model');

async function mantenimiento(req, res, next) {
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin') || ['/login', '/registro', '/logout'].includes(req.path)) {
    return next();
  }

  try {
    const config = await Configuracion.findOne().lean();
    if (config?.modo_mantenimiento && req.usuario?.rol !== 'Admin') {
      return res.status(503).send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Mantenimiento</title></head><body><main><h1>${config.mensaje_mantenimiento || 'Estamos realizando mejoras. Volvemos pronto.'}</h1><p>Intenta nuevamente más tarde.</p></main></body></html>`);
    }
  } catch (error) {
    console.error(`No se pudo consultar el modo mantenimiento: ${error.message}`);
  }
  return next();
}

module.exports = mantenimiento;

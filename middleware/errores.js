/**
 * Manejo de errores de la aplicación.
 * Aquí viven el envoltorio para controladores async, el 404 y el capturador
 * final que muestra una página amigable con un código de reporte.
 */
const crypto = require('crypto');
const log = require('../servicios/log');

/** Envuelve un controlador async para que los errores lleguen al middleware. */
function asyncHandler(controlador) {
  // No se pasa "next" al controlador: algunos lo reciben como parámetro de
  // error y terminan mostrando la función de Express en la página.
  return (req, res, next) => Promise.resolve(controlador(req, res)).catch(next);
}

/** Código corto que se le puede dictar a una persona por teléfono. */
function codigoDeReporte() {
  return `E-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Los datos técnicos solo se muestran cuando quien mira es administrador. */
function detalleParaAdmin(req, codigo, error) {
  if (!req.usuario || req.usuario.rol !== 'Admin') return null;

  return {
    codigo_http: codigo,
    tipo: error ? error.name : '',
    ruta: String(req.originalUrl || req.url || '/').slice(0, 300),
    metodo: req.method
  };
}

/** Responde 404 cuando ninguna ruta coincide. */
function noEncontrado(req, res) {
  // A la API se le responde en JSON; al navegador, con la vista de error.
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ mensaje: 'Ruta no encontrada' });
  }

  return res.status(404).render('errores/error', {
    layout: false,
    codigo: 404,
    codigo_reporte: '',
    titulo: 'Página no encontrada',
    mensaje: 'La página que buscas no existe o fue movida.',
    detalle_admin: null
  });
}

/** Captura cualquier error no controlado y muestra una página amigable. */
function manejarErrores(error, req, res, next) {
  console.error('Error no controlado:', error.message);
  log.escribir(`ERROR ${req.method} ${req.originalUrl}: ${error.message}`);

  // Si la respuesta ya empezó, el error se pasa a Express para que cierre la conexión.
  if (res.headersSent) return next(error);

  // Las rutas de la API reciben JSON sin detalles internos.
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }

  // En el sitio se genera un código de reporte y se registra el error.
  const codigo = codigoDeReporte();
  void log.registrarError(req, codigo, error);

  return res.status(500).render('errores/error', {
    layout: false,
    codigo: 500,
    codigo_reporte: codigo,
    titulo: 'Algo salió mal',
    mensaje: 'No se pudo completar la solicitud. Inténtalo de nuevo más tarde.',
    detalle_admin: detalleParaAdmin(req, 500, error)
  });
}

// Exporta el envoltorio async, el capturador final y el 404.
module.exports = { asyncHandler, manejarErrores, noEncontrado };

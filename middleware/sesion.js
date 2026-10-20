/**
 * Sesión de usuario para las vistas: lectura de la cookie, exigencia de
 * sesión y de rol, y protección CSRF de los formularios.
 */
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const Notificacion = require('../models/notificacion.model');
const { leerCarrito, obtenerToken } = require('../config/session');

/**
 * Lee la cookie de sesión y deja el usuario disponible en req.usuario
 * y en res.locals para que las vistas lo puedan usar.
 */
async function cargarSesion(req, res, next) {
  // Valores por defecto mientras no haya sesión: visitante anónimo.
  req.usuario = null;
  res.locals.logueado = null;
  res.locals.usuario = null;
  res.locals.rol = '';
  // Total de artículos del carrito, que vive en la cookie y no depende del usuario.
  res.locals.cantidad = leerCarrito(req).reduce((total, item) => total + (Number(item.cantidad) || 0), 0);
  res.locals.notificaciones_no_leidas = 0;
  res.locals.mensajes_no_leidos = 0;

  const token = obtenerToken(req);
  // Sin cookie de sesión: se continúa como visitante.
  if (!token) return next();

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(datos.id).select('+tokenVersion');

    // Si el token es viejo (la contraseña cambió) o la cuenta está suspendida, se ignora.
    const tokenVigente = (datos.tokenVersion || 0) === (usuario ? usuario.tokenVersion || 0 : -1);

    if (usuario && usuario.activo !== false && tokenVigente) {
      req.usuario = usuario;
      res.locals.logueado = usuario;
      res.locals.usuario = usuario;
      res.locals.rol = usuario.rol;
      res.locals.notificaciones_no_leidas = await Notificacion.countDocuments({
        usuario: usuario._id,
        leida: false
      });
      // La página depende del usuario: no debe guardarse en caché compartida.
      res.set('Cache-Control', 'private, no-store');
    }
  } catch {
    // Si la cookie está vencida o dañada se continúa como visitante.
  }

  next();
}

/** Redirige al login cuando la página necesita una sesión. */
function exigirSesion(req, res, next) {
  if (req.usuario) return next();

  const destino = req.originalUrl && req.originalUrl !== '/' ? req.originalUrl : '';
  return res.redirect(`/login${destino ? `?next=${encodeURIComponent(destino)}` : ''}`);
}

/** Permite el paso solo a los roles indicados. */
function exigirRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) return exigirSesion(req, res, next);

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).send('No tienes permisos para acceder a esta página.');
    }

    next();
  };
}

/**
 * Protección CSRF sencilla: en los formularios se revisa que la petición
 * venga del mismo sitio. Las peticiones con token Bearer no la necesitan.
 */
function protegerCSRF(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if ((req.headers.authorization || '').startsWith('Bearer ')) return next();

  const origen = req.get('origin');
  const referente = req.get('referer');
  const host = req.get('host');

  function esDelMismoSitio(valor) {
    try {
      return new URL(valor).host === host;
    } catch {
      return false;
    }
  }

  const permitido = (origen && esDelMismoSitio(origen)) || (!origen && referente && esDelMismoSitio(referente));

  if (permitido) return next();

  return res.status(403).send('Solicitud rechazada por protección CSRF.');
}

// Se exportan la carga de sesión, los guardas de rol/sesión y el control CSRF.
module.exports = { cargarSesion, exigirRol, exigirSesion, protegerCSRF };

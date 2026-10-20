const NOMBRE_SESION = 'tc_session';
const NOMBRE_CARRITO = 'tc_cart';

const esProduccion = () => process.env.NODE_ENV === 'production';

/** Lee una cookie del navegador por su nombre. */
function obtenerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;

  const parte = cabecera
    .split(';')
    .map((valor) => valor.trim())
    .find((valor) => valor.startsWith(`${nombre}=`));

  if (!parte) return null;

  try {
    return decodeURIComponent(parte.slice(nombre.length + 1));
  } catch {
    return null;
  }
}

/**
 * Devuelve el token de sesión.
 * Se acepta la cabecera Authorization para las pruebas de la API con Postman.
 */
function obtenerToken(req) {
  const autorizacion = req.headers.authorization;

  if (autorizacion && autorizacion.startsWith('Bearer ')) {
    return autorizacion.slice(7).trim();
  }

  return obtenerCookie(req, NOMBRE_SESION);
}

/** Guarda el token JWT en una cookie httpOnly. */
function guardarSesion(res, token) {
  res.cookie(NOMBRE_SESION, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: esProduccion(),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

/** Elimina la cookie de sesión. */
function cerrarSesion(res) {
  res.clearCookie(NOMBRE_SESION, {
    httpOnly: true,
    sameSite: 'strict',
    secure: esProduccion(),
    path: '/'
  });
}

/** Lee el carrito guardado en la cookie. */
function leerCarrito(req) {
  const valor = obtenerCookie(req, NOMBRE_CARRITO);
  if (!valor) return [];

  try {
    const carrito = JSON.parse(valor);
    return Array.isArray(carrito) ? carrito : [];
  } catch {
    return [];
  }
}

/** Guarda el carrito en una cookie que dura 30 días. */
function guardarCarrito(res, carrito) {
  res.cookie(NOMBRE_CARRITO, JSON.stringify(carrito), {
    httpOnly: true,
    sameSite: 'strict',
    secure: esProduccion(),
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

module.exports = {
  cerrarSesion,
  guardarCarrito,
  guardarSesion,
  leerCarrito,
  obtenerCookie,
  obtenerToken
};

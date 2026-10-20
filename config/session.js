/**
 * Manejo de sesión y carrito mediante cookies del navegador.
 * La sesión es un JWT guardado en una cookie httpOnly; el carrito de la tienda
 * vive en otra cookie en formato JSON. Todas las funciones son puras sobre req/res.
 */

// Nombres de las cookies (sesión y carrito) usadas en todo el proyecto.
const NOMBRE_SESION = 'tc_session';
const NOMBRE_CARRITO = 'tc_cart';

// En producción las cookies se marcan "secure" (solo HTTPS).
const esProduccion = () => process.env.NODE_ENV === 'production';

/**
 * Lee una cookie del navegador por su nombre.
 * @param {object} req Petición de Express.
 * @param {string} nombre Nombre de la cookie.
 * @returns {string|null} Valor decodificado o null si no existe.
 */
function obtenerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;

  const parte = cabecera
    .split(';')
    .map((valor) => valor.trim())
    .find((valor) => valor.startsWith(`${nombre}=`));

  if (!parte) return null;

  // Si el valor está mal formado se devuelve null en vez de fallar.
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

  // Cabecera Authorization: "Bearer <token>" (pruebas con Postman/Postman collections).
  if (autorizacion && autorizacion.startsWith('Bearer ')) {
    return autorizacion.slice(7).trim();
  }

  // Si no hay cabecera, se toma la cookie de sesión normal del navegador.
  return obtenerCookie(req, NOMBRE_SESION);
}

/**
 * Guarda el token JWT en una cookie httpOnly.
 * @param {object} res Respuesta de Express.
 * @param {string} token JWT firmado a guardar.
 */
function guardarSesion(res, token) {
  res.cookie(NOMBRE_SESION, token, {
    httpOnly: true,   // inaccesible desde JavaScript del navegador
    sameSite: 'strict', // protección frente a CSRF
    secure: esProduccion(),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días de duración
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

/**
 * Lee el carrito guardado en la cookie.
 * @param {object} req Petición de Express.
 * @returns {Array} Arreglo de líneas del carrito; vacío si la cookie no está o es inválida.
 */
function leerCarrito(req) {
  const valor = obtenerCookie(req, NOMBRE_CARRITO);
  if (!valor) return [];

  // La cookie es JSON; si alguien la manipuló se descarta y se devuelve carrito vacío.
  try {
    const carrito = JSON.parse(valor);
    return Array.isArray(carrito) ? carrito : [];
  } catch {
    return [];
  }
}

/**
 * Guarda el carrito en una cookie que dura 30 días.
 * @param {object} res Respuesta de Express.
 * @param {Array} carrito Líneas del carrito a serializar en JSON.
 */
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

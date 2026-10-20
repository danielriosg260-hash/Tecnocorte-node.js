/**
 * Limita la cantidad de intentos por IP y por correo.
 * Se usa en el login, la verificación de correo y la recuperación de contraseña.
 */
const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAX_INTENTOS = 5;

function crearLimitador(prefijo, maximo, mensaje) {
  return function limitar(req, res, next) {
    const correo = String(req.body.email || req.body.user || req.query.email || '')
      .trim()
      .toLowerCase();
    const clave = `${prefijo}:${req.ip}:${correo}`;
    const ahora = Date.now();

    const registros = (intentos.get(clave) || []).filter((hora) => hora > ahora - VENTANA_MS);

    if (registros.length >= maximo) {
      const espera = Math.ceil((registros[0] + VENTANA_MS - ahora) / 1000);
      res.set('Retry-After', String(espera));
      return res.status(429).send(mensaje);
    }

    intentos.set(clave, [...registros, ahora]);
    next();
  };
}

const limitarLogin = (req, res, next) => {
  const correo = String(req.body.email || req.body.user || '')
    .trim()
    .toLowerCase();
  const clave = `login:${req.ip}:${correo}`;
  const ahora = Date.now();
  const registros = (intentos.get(clave) || []).filter((hora) => hora > ahora - VENTANA_MS);

  if (registros.length >= MAX_INTENTOS) {
    const espera = Math.ceil((registros[0] + VENTANA_MS - ahora) / 1000);
    res.set('Retry-After', String(espera));
    return res.status(429).send('Demasiados intentos. Inténtalo de nuevo más tarde.');
  }

  intentos.set(clave, [...registros, ahora]);

  // Si el login sale bien se borran los intentos fallidos.
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) intentos.delete(clave);
  });

  next();
};

limitarLogin.limitarVerificacion = crearLimitador(
  'verificacion',
  10,
  'Demasiados intentos de verificación. Inténtalo más tarde.'
);
limitarLogin.limitarReenvio = crearLimitador(
  'reenvio',
  3,
  'Demasiados reenvíos. Inténtalo más tarde.'
);
limitarLogin.limitarRecuperacion = crearLimitador(
  'recuperacion',
  3,
  'Demasiadas solicitudes. Inténtalo más tarde.'
);

module.exports = limitarLogin;
module.exports.limitarRecuperacion = limitarLogin.limitarRecuperacion;
module.exports.limitarReenvio = limitarLogin.limitarReenvio;
module.exports.limitarVerificacion = limitarLogin.limitarVerificacion;

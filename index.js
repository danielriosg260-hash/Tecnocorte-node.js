// Se cargan las variables del .env antes de usar cualquier módulo que las lea.
require('dotenv').config({ quiet: true });
// Todas las citas del negocio usan la hora de Colombia, incluso en Vercel.
// APP_TIMEZONE es configurable; TZ está reservado por Vercel y no se usa
// como variable del proyecto.
process.env.TZ = process.env.APP_TIMEZONE || 'America/Bogota';

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const morgan = require('morgan');
const { conectarDB } = require('./config/db');
const log = require('./servicios/log');
const { iniciarBackup } = require('./servicios/backup');
const { cargarSesion, protegerCSRF } = require('./middleware/sesion');
const mantenimiento = require('./middleware/mantenimiento');
const { manejarErrores, noEncontrado } = require('./middleware/errores');

// Comprobación de la configuración mínima antes de montar la aplicación.
if (!(process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL) || !process.env.JWT_SECRET) {
  throw new Error('MONGO_URI (o DATABASE_URL) y JWT_SECRET son obligatorios para iniciar TecnoCorte');
}

// En producción la clave debe ser larga para resistir ataques de fuerza bruta.
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}

const app = express();

app.disable('x-powered-by');
// Detrás de un proxy en producción se confía en la primera cabecera X-Forwarded-For.
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Middlewares de cuerpo: JSON y formularios, con límite de 20 KB.
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// Motor de plantillas EJS con el layout base y archivos estáticos.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');
app.use(express.static(path.join(__dirname, 'public')));

// Cabeceras de seguridad para todas las respuestas.
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    ...(process.env.NODE_ENV === 'production'
      ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
      : {})
  });
  next();
});

// Funciones que usan todas las vistas.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const dosDigitos = (numero) => String(numero).padStart(2, '0');

app.locals.fmtMoneda = (valor) => `$${(Number(valor) || 0).toLocaleString('es-CO')}`;

/** Formatea fechas con los mismos códigos que usa Django (d/m/Y, H:i, M, F...). */
app.locals.fmtFecha = (valor, patron = 'd/m/Y') => {
  if (!valor) return '';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  const reemplazos = {
    d: dosDigitos(fecha.getDate()),
    j: String(fecha.getDate()),
    m: dosDigitos(fecha.getMonth() + 1),
    n: String(fecha.getMonth() + 1),
    M: MESES[fecha.getMonth()].slice(0, 3),
    F: MESES[fecha.getMonth()],
    Y: String(fecha.getFullYear()),
    y: String(fecha.getFullYear()).slice(-2),
    H: dosDigitos(fecha.getHours()),
    G: String(fecha.getHours()),
    h: dosDigitos(fecha.getHours() % 12 || 12),
    g: String(fecha.getHours() % 12 || 12),
    i: dosDigitos(fecha.getMinutes()),
    s: dosDigitos(fecha.getSeconds()),
    l: DIAS_SEMANA[fecha.getDay()],
    D: DIAS_SEMANA[fecha.getDay()].slice(0, 3)
  };

  return patron.replace(/\\.|./g, (token) => {
    if (token.startsWith('\\')) return token.slice(1);
    return Object.prototype.hasOwnProperty.call(reemplazos, token) ? reemplazos[token] : token;
  });
};

app.locals.fmtHora = (valor) => {
  if (!valor) return '';

  if (valor instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(valor))) {
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
  }

  return String(valor).slice(0, 5);
};

app.locals.anio = new Date().getFullYear();

// Middlewares globales: primero la sesión (necesaria para el resto),
// después el modo mantenimiento y por último el registro de peticiones.
app.use(cargarSesion);
app.use(mantenimiento);
app.use(morgan('dev'));
// La API también acepta cookies; exige origen/referer propio salvo que use
// Authorization: Bearer, que es el flujo habitual de clientes externos.
app.use('/api', protegerCSRF);

// API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/productos', require('./routes/producto.routes'));
app.use('/api/peluquerias', require('./routes/peluqueria.routes'));
app.use('/api/reservas', require('./routes/reserva.routes'));
app.use('/api/pedidos', require('./routes/pedido.routes'));
app.use('/api/pedidos-producto', require('./routes/pedidoproducto.routes'));

// Páginas
app.use('/', require('./routes/publico.routes'));
app.use('/', require('./routes/cuenta.routes'));
app.use('/barbero', require('./routes/barbero.routes'));
app.use('/admin', require('./routes/admin.routes'));

// 404 para lo que no coincide con ninguna ruta y capturador final de errores.
app.use(noEncontrado);
app.use(manejarErrores);

const PORT = process.env.PORT || 3000;

/**
 * Arranque local: conecta la base de datos, levanta el servidor en el puerto
 * indicado y lanza las copias de seguridad programadas. En Vercel, el
 * servidor se importa desde `api/index.js` y la plataforma administra el
 * ciclo de vida de la función.
 * Si algo falla se deja constancia en el log y se marca el proceso con error.
 */
const iniciarServidor = async () => {
  try {
    // Sin base de datos no se abre el puerto.
    await conectarDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      log.escribir(`Servidor iniciado en el puerto ${PORT}`);
    });

    // Vercel termina las funciones cuando quedan inactivas y no garantiza
    // procesos persistentes; allí el backup se ejecuta desde un cron externo.
    if (!process.env.VERCEL) iniciarBackup();
  } catch (error) {
    console.error(`No se pudo iniciar TecnoCorte: ${error.message}`);
    log.escribir(`ERROR al iniciar: ${error.message}`);
    process.exitCode = 1;
  }
};

// Arranque del proceso: los fallos se tratan dentro de iniciarServidor.
if (require.main === module) void iniciarServidor();

module.exports = app;

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const { cargarSesion } = require('./middleware/webAuth');

// Carga las variables del archivo .env sin imprimir diagnósticos de dotenv en producción.
dotenv.config({ quiet: true });

if (!(process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL) || !process.env.JWT_SECRET) {
  throw new Error('MONGO_URI (o DATABASE_URL) y JWT_SECRET son obligatorios para iniciar TecnoCorte');
}

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Middlewares: funciones que se ejecutan antes de llegar a las rutas.
// express.json() permite recibir datos en formato JSON en el body de las peticiones.
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// Vistas con EJS: motor de plantillas, carpeta de vistas y archivos estáticos (css, imagenes, js).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    ...(process.env.NODE_ENV === 'production' ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {})
  });
  next();
});

// Helpers disponibles en todas las plantillas EJS.
app.locals.fmtMoneda = (valor) => {
  const n = Number(valor) || 0;
  return `$${n.toLocaleString('es-CO')}`;
};
app.locals.fmtFecha = (valor, patron) => {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mapa = {
    d: String(fecha.getDate()),
    j: String(fecha.getDate()),
    m: String(fecha.getMonth() + 1),
    n: String(fecha.getMonth() + 1),
    M: meses[fecha.getMonth()].slice(0, 3),
    F: meses[fecha.getMonth()],
    Y: String(fecha.getFullYear()),
    y: String(fecha.getFullYear()).slice(-2),
    H: String(fecha.getHours()).padStart(2, '0'),
    G: String(fecha.getHours()),
    i: String(fecha.getMinutes()).padStart(2, '0')
  };
  const tokens = patron.match(/[dDjlNwSFmMnYyHGighis]/g) || [];
  let salida = patron;
  tokens.forEach((tok) => {
    salida = salida.replace(new RegExp(tok, 'g'), mapa[tok] || tok);
  });
  return salida;
};
app.locals.fmtHora = (valor) => {
  if (!valor) return '';
  const fecha = new Date(`1970-01-01T${valor}`);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toTimeString().slice(0, 5);
};
app.locals.cantidad = 0;
app.locals.notificaciones_no_leidas = 0;
app.locals.mensajes_no_leidos = 0;

// Definir defaults para variables de plantilla y evitar errores "not defined".
app.use((req, res, next) => {
  res.locals.logueado = null;
  res.locals.usuario_actual = { foto: '' };
  res.locals.cantidad = 0;
  res.locals.notificaciones_no_leidas = 0;
  res.locals.mensajes_no_leidos = 0;
  res.locals.messages = [];
  res.locals.form_post = '';
  res.locals.exito = '';
  res.locals.error = '';
  res.locals.mensaje_tienda = '';
  res.locals.mensaje_carrito = '';
  res.locals.rol = '';
  res.locals.editar = false;
  res.locals.total = 0;
  res.locals.maximo = 100;
  res.locals.ventas_servicios = 0;
  res.locals.ventas_productos = 0;
  res.locals.total_clientes = 0;
  res.locals.estado_citas = [];
  res.locals.productos = [];
  res.locals.servicios = [];
  res.locals.peluquerias = [];
  res.locals.peluqueros = [];
  res.locals.usuarios = [];
  res.locals.reservas = [];
  res.locals.datos = [];
  res.locals.ingresos = [];
  res.locals.bloques_horarios = [];
  res.locals.mensajes = [];
  res.locals.notificaciones = [];
  res.locals.calificaciones_reservas = [];
  res.locals.horarios_json = '{}';
  res.locals.bloqueos_json = '{}';
  res.locals.reservas_json = '{}';
  res.locals.lista_horarios = [];
  res.locals.registros = [];
  res.locals.usuario = null;
  res.locals.producto = null;
  res.locals.reserva = null;
  res.locals.peluqueria = null;
  res.locals.peluquero = null;
  res.locals.pedido = null;
  res.locals.items = [];
  res.locals.clientes = [];
  res.locals.roles = [];
  res.locals.dia_semana = '';
  res.locals.bloqueo = null;
  res.locals.estados = [];
  res.locals.categorias = [];
  res.locals.reserva_estados = [];
  res.locals.peluqueria_actual = null;
  res.locals.rol_filtro = '';
  res.locals.total_usuarios = 0;
  res.locals.proximo = '';
  res.locals.enviado = false;
  res.locals.valido = true;
  res.locals.fecha_hoy = '';
  res.locals.asunto = '';
  res.locals.cuerpo = '';
  res.locals.enlace = '';
  res.locals.logo_url = '';
  res.locals.ultimas_reservas = [];
  res.locals.total_admin = 0;
  res.locals.promedio = 0;
  res.locals.hora_actual = '';
  res.locals.horarios = [];
  res.locals.total_peluqueros = 0;
  res.locals.total_calificaciones = 0;
  res.locals.texto_enlace = 'Ver detalles';
  res.locals.citas = [];
  res.locals.servicio_inicial = '';
  res.locals.bloqueos = [];
  res.locals.citas_hoy = [];
  res.locals.calificaciones = [];
  res.locals.pedidos = [];
  res.locals.peluqueria_inicial = '';
  next();
});

app.use(cargarSesion);

// morgan muestra en la consola cada petición que llega (solo en desarrollo).
app.use(morgan('dev'));

// Rutas: se registran las rutas de cada modelo bajo su dirección.
app.use('/api/auth', require('./routes/Auth.routes'));
app.use('/api/usuarios', require('./routes/Usuario.routes'));
app.use('/api/productos', require('./routes/Producto.routes'));
app.use('/api/peluquerias', require('./routes/Peluqueria.routes'));
app.use('/api/pedidos', require('./routes/Pedido.routes'));
app.use('/api/reservas', require('./routes/Reserva.routes'));
app.use('/api/pedidos-producto', require('./routes/PedidoProducto.routes'));

// Páginas EJS (vistas) del sitio web.
app.use('/', require('./routes/Page.routes'));

app.use((error, req, res, next) => {
  console.error('Error no controlado:', error.message);
  if (res.headersSent) return next(error);
  if (req.path.startsWith('/api/')) return res.status(500).json({ mensaje: 'Error interno del servidor' });
  return res.status(500).send('No se pudo completar la solicitud. Inténtalo de nuevo más tarde.');
});

// El servidor solo acepta tráfico después de validar la conexión con MongoDB.
const PORT = process.env.PORT || 3026;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`No se pudo iniciar TecnoCorte: ${error.message}`);
    process.exitCode = 1;
  }
};

void startServer();

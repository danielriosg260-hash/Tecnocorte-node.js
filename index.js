const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { connectDB } = require('./config/db');

// Carga las variables del archivo .env (PORT y DATABASE_URL).
dotenv.config();

// Conecta a la base de datos MongoDB antes de arrancar el servidor.
connectDB();

const app = express();

// Middlewares: funciones que se ejecutan antes de llegar a las rutas.
// express.json() permite recibir datos en formato JSON en el body de las peticiones.
app.use(express.json());

// Vistas con EJS: motor de plantillas, carpeta de vistas y archivos estáticos (css, imagenes, js).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/base');
app.use(express.static(path.join(__dirname, 'public')));

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

// Puerto donde escucha el servidor, se lee del .env.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

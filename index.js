const express = require('express');
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

// Puerto donde escucha el servidor, se lee del .env.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

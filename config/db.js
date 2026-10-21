/**
 * Módulo de conexión a MongoDB.
 * Centraliza la lectura de la URI desde el entorno y el establecimiento
 * de la conexión única que usa toda la aplicación (mongoose).
 */
const mongoose = require('mongoose');

// Vercel puede reutilizar una instancia de la función. Se conserva la
// promesa para no abrir varias conexiones simultáneas durante un cold start.
let conexionPendiente;

// Nombre de la base de datos que se usa cuando la URI no lo trae.
const BASE_DATOS = process.env.MONGO_DB_NAME || 'tecnocorte';

/**
 * Devuelve la cadena de conexión configurada en el archivo .env.
 * Se aceptan tres nombres porque el proyecto se desplegó en varios servicios
 * y cada uno entrega la variable con un nombre distinto.
 */
function obtenerUri() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!uri) {
    throw new Error('Falta MONGO_URI en el archivo .env');
  }

  return uri.trim();
}

/**
 * Abre la conexión con MongoDB usando mongoose.
 * Se llama una sola vez cuando arranca el servidor.
 */
async function conectarDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (conexionPendiente) return conexionPendiente;

  // Registra los errores que ocurran después de conectado (reintentos, red caída).
  mongoose.connection.on('error', (error) => {
    console.error('Error de conexión a MongoDB:', error.message);
  });

  // dbName permite que la URI apunte a un clúster pero se use esta base concreta.
  conexionPendiente = mongoose
    .connect(obtenerUri(), { dbName: BASE_DATOS })
    .then(() => {
      console.log(`Conectado a MongoDB (base de datos: ${BASE_DATOS})`);
      return mongoose.connection;
    })
    .catch((error) => {
      conexionPendiente = undefined;
      throw error;
    });

  return conexionPendiente;
}

module.exports = { conectarDB };

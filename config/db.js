const mongoose = require('mongoose');

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
  mongoose.connection.on('error', (error) => {
    console.error('Error de conexión a MongoDB:', error.message);
  });

  await mongoose.connect(obtenerUri(), { dbName: BASE_DATOS });
  console.log(`Conectado a MongoDB (base de datos: ${BASE_DATOS})`);
}

module.exports = { conectarDB };

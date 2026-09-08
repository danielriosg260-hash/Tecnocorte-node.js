const mongoose = require("mongoose");

const CONNECTION_ENV_NAMES = ['MONGO_URI', 'MONGODB_URI', 'DATABASE_URL'];

const resolveConnectionString = () => {
  const configured = CONNECTION_ENV_NAMES
    .map((name) => ({ name, value: process.env[name]?.trim() }))
    .filter(({ value }) => value);

  if (configured.length > 1) {
    throw new Error(`Configura solo una variable de conexión a MongoDB: ${CONNECTION_ENV_NAMES.join(', ')}`);
  }

  const connectionString = configured[0]?.value;
  if (!connectionString) throw new Error('Configura MONGO_URI (o DATABASE_URL) para conectar con MongoDB');
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1|::1/.test(connectionString)) {
    throw new Error('En producción no puedes usar MongoDB local. Configura MONGO_URI con una URL de MongoDB Atlas');
  }
  return connectionString;
};

mongoose.connection.on("error", (error) => {
  console.error("Error de conexión a MongoDB:", error.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB desconectado. Reintentando conexión...");
});

const connectDB = async () => {
  const connectionString = resolveConnectionString();
  try {
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 10000,
      bufferTimeoutMS: 5000
    });
  } catch (error) {
    if (error.codeName === 'AuthenticationFailed' || /bad auth|authentication failed/i.test(error.message)) {
      throw new Error('MongoDB rechazó la autenticación. Verifica en Atlas el usuario, la contraseña y la URI configurada en Render.');
    }
    throw error;
  }
  console.log("Conectado a MongoDB correctamente");
};

module.exports = { connectDB };

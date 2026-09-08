const mongoose = require("mongoose");

const RETRY_MS = 3000;

const resolveConnectionString = () => {
  const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
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

const retryConnect = async (attempt = 1) => {
  const connectionString = resolveConnectionString();
  try {
    await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 10000 });
    console.log("Conectado a MongoDB correctamente");
  } catch (error) {
    console.error(`No se pudo conectar a MongoDB (intento ${attempt}):`, error.message);
    console.error(`Se reintentará en ${RETRY_MS / 1000} segundos. El servidor sigue activo.`);
    setTimeout(() => retryConnect(attempt + 1), RETRY_MS);
  }
};

const connectDB = () => retryConnect();

module.exports = { connectDB };
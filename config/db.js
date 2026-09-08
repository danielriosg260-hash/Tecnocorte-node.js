const mongoose = require("mongoose");

const connectDB = async () => {
  const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Configura MONGO_URI (o DATABASE_URL) para conectar con MongoDB');
  if (process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1|::1/.test(connectionString)) {
    throw new Error('En producción no puedes usar MongoDB local. Configura MONGO_URI con una URL de MongoDB Atlas');
  }

  await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 10000 });
  console.log("Conectado a MongoDB correctamente");
};

module.exports = { connectDB };

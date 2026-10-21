// Handler serverless para Vercel. Express sigue gestionando todas las rutas;
// este archivo solo conecta MongoDB antes de entregar la petición a la app.
const app = require('../index');
const { conectarDB } = require('../config/db');

module.exports = async function handler(req, res) {
  await conectarDB();
  return app(req, res);
};

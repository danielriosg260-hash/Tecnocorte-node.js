const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

// Carpeta donde se guardan los respaldos.
const CARPETA_BACKUP = path.join(__dirname, '..', 'backup');

/** Devuelve la fecha y hora actual en formato AAAA-MM-DD_HH-mm-ss. */
function fechaActual() {
  const ahora = new Date();
  const dosDigitos = (numero) => String(numero).padStart(2, '0');

  const fecha = [
    ahora.getFullYear(),
    dosDigitos(ahora.getMonth() + 1),
    dosDigitos(ahora.getDate())
  ].join('-');

  const hora = [
    dosDigitos(ahora.getHours()),
    dosDigitos(ahora.getMinutes()),
    dosDigitos(ahora.getSeconds())
  ].join('-');

  return `${fecha}_${hora}`;
}

/**
 * Genera un respaldo de la base de datos con mongodump.
 * Cada respaldo queda en su propia carpeta dentro de /backup.
 */
exports.backupDatabase = function () {
  return new Promise((resolve) => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

    if (!uri) {
      console.error('No se puede respaldar: falta MONGO_URI en el .env');
      return resolve(false);
    }

    fs.mkdirSync(CARPETA_BACKUP, { recursive: true });

    const destino = path.join(CARPETA_BACKUP, fechaActual());
    const comando = `mongodump --uri "${uri}" --out "${destino}" --gzip`;

    exec(comando, (error, stdout, stderr) => {
      if (error) {
        console.error('Error en el respaldo:', error.message);
        return resolve(false);
      }

      console.log('Respaldo completado con éxito en:', destino);
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
      resolve(true);
    });
  });
};

/**
 * Programa el respaldo para todos los días a las 12:00 de la noche.
 * Se llama desde index.js cuando arranca el servidor.
 */
exports.iniciarBackup = function () {
  cron.schedule('0 0 0 * * *', async () => {
    console.log('Realizando backup de la base de datos');
    await exports.backupDatabase();
  });

  console.log('Backup programado: todos los días a las 00:00');
};

const { exec } = require('child_process');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

// Carpeta donde se guardan los respaldos.
const CARPETA_BACKUP = path.join(__dirname, '..', 'backup');

/**
 * Genera un respaldo de la base de datos con mongodump.
 * El resultado queda comprimido dentro de la carpeta /backup.
 */
exports.backupDatabase = function () {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!uri) {
    console.error('No se puede respaldar: falta MONGO_URI en el .env');
    return;
  }

  const comando = `mongodump --uri "${uri}" --out "${CARPETA_BACKUP}" --gzip`;

  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error('Error en el respaldo:', error.message);
      return;
    }

    console.log('Respaldo completado con éxito');
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
  });
};

/**
 * Programa el respaldo para todos los días a las 12:00 de la noche.
 * Se llama desde index.js cuando arranca el servidor.
 */
exports.iniciarBackup = function () {
  cron.schedule('0 0 0 * * *', () => {
    console.log('Realizando backup de la base de datos');
    exports.backupDatabase();
  });

  console.log('Backup programado: todos los días a las 00:00');
};

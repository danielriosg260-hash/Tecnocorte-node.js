const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
require('dotenv').config({ quiet: true });
const transporter = require('../config/email');

const execFileAsync = promisify(execFile);
const backupDir = path.join(__dirname, '..', 'backup-email');
const logFile = path.join(__dirname, '..', 'logs', 'backup.log');
const destinatario = process.env.BACKUP_EMAIL || 'tecnocorte083@gmail.com';
const databaseName = process.env.MONGO_DB_NAME || 'tecnocorte';

function escribirLog(mensaje) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${mensaje}\n`);
}

async function backupDatabase() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error('No existe MONGO_URI, MONGODB_URI ni DATABASE_URL.');

  fs.mkdirSync(backupDir, { recursive: true });
  const fecha = new Date().toISOString().replace(/[:.]/g, '-');
  const archivo = path.join(backupDir, `tecnocorte-${fecha}.archive.gz`);

  escribirLog(`Iniciando backup de la base ${databaseName}`);

  try {
    await execFileAsync('mongodump', [
      '--uri', uri,
      '--db', databaseName,
      `--archive=${archivo}`,
      '--gzip',
    ]);

    const { size } = fs.statSync(archivo);
    if (size > 24 * 1024 * 1024) {
      throw new Error('El backup supera 24 MB y no se puede enviar como adjunto de Gmail.');
    }

    await transporter.sendMail({
      from: `TecnoCorte <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: `Backup de TecnoCorte - ${fecha}`,
      text: `Respaldo automático generado el ${new Date().toLocaleString('es-CO')}.`,
      attachments: [{ filename: path.basename(archivo), path: archivo }],
    });
    console.log(`Backup creado y enviado a ${destinatario}: ${archivo}`);
    escribirLog(`Backup enviado correctamente: ${path.basename(archivo)}`);
    return archivo;
  } catch (error) {
    escribirLog(`Error en backup: ${error.message}`);
    throw error;
  } finally {
    fs.rmSync(archivo, { force: true });
  }
}

module.exports = { backupDatabase };

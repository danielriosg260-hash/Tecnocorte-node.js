const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Un solo módulo con operaciones de log tipo objeto (como sport.leer / sport.escribir)
const log = {
  // Escribe una línea con fecha y hora en el archivo
  escribir(mensaje) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      const timestamp = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      fs.appendFileSync(LOG_FILE, `[${timestamp}] ${mensaje}\n`, 'utf8');
      return true;
    } catch (error) {
      console.error('Error escribiendo log:', error.message);
      return false;
    }
  },

  // Lee y devuelve todo el contenido del archivo de log
  leer() {
    try {
      if (!fs.existsSync(LOG_FILE)) return '';
      return fs.readFileSync(LOG_FILE, 'utf8');
    } catch (error) {
      console.error('Error leyendo log:', error.message);
      return '';
    }
  },

  // Versión asíncrona de escribir
  async escribirAsync(mensaje) {
    try {
      await fs.promises.mkdir(LOG_DIR, { recursive: true });
      const timestamp = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      await fs.promises.appendFile(LOG_FILE, `[${timestamp}] ${mensaje}\n`, 'utf8');
      return true;
    } catch (error) {
      console.error('Error escribiendo log:', error.message);
      return false;
    }
  },

  ruta: LOG_FILE
};

module.exports = log;

const fs = require('fs');
const path = require('path');

// Módulo de utilidades para archivos: leer, escribir, borrar, permisos
const archivo = {
  // Escribir (sobrescribe; si no existe lo crea)
  escribir(ruta, contenido) {
    try {
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, contenido, 'utf8');
      console.log(`Archivo escrito: ${ruta}`);
      return true;
    } catch (error) {
      console.error('Error escribiendo archivo:', error.message);
      return false;
    }
  },

  // Leer contenido
  leer(ruta) {
    try {
      if (!fs.existsSync(ruta)) {
        console.error('El archivo no existe:', ruta);
        return null;
      }
      return fs.readFileSync(ruta, 'utf8');
    } catch (error) {
      console.error('Error leyendo archivo:', error.message);
      return null;
    }
  },

  // Borrar archivo
  borrar(ruta) {
    try {
      if (!fs.existsSync(ruta)) {
        console.error('El archivo no existe:', ruta);
        return false;
      }
      fs.unlinkSync(ruta);
      console.log(`Archivo borrado: ${ruta}`);
      return true;
    } catch (error) {
      console.error('Error borrando archivo:', error.message);
      return false;
    }
  },

  // Agregar al final del archivo (como tu fragmento), en 3 versiones separadas
  agregar: {
    // SÍNCRONO
    sincrono(ruta, mensaje) {
      const logEntry = `${new Date().toISOString()} - ${mensaje}\n`;
      try {
        fs.appendFileSync(ruta, logEntry);
        console.log('Log agregado (sync)');
        return true;
      } catch (err) {
        console.error('Error escribiendo log:', err.message);
        return false;
      }
    },

    // ASÍNCRONO (callback)
    asincrono(ruta, mensaje, callback) {
      const logEntry = `${new Date().toISOString()} - ${mensaje}\n`;
      fs.appendFile(ruta, logEntry, (err) => {
        if (err) {
          console.error('Error escribiendo log:', err.message);
          if (callback) callback(err);
          return;
        }
        console.log('Log agregado (async)');
        if (callback) callback(null);
      });
    },

    // PROMISES (usa await dentro de una función async)
    async promesas(ruta, mensaje) {
      const logEntry = `${new Date().toISOString()} - ${mensaje}\n`;
      try {
        await fs.promises.appendFile(ruta, logEntry);
        console.log('Log agregado (promises)');
        return true;
      } catch (err) {
        console.error('Error escribiendo log:', err.message);
        return false;
      }
    }
  },

  // Leer permisos (lectura, escritura, ejecución)
  permisos(ruta) {
    try {
      if (!fs.existsSync(ruta)) {
        console.error('El archivo no existe:', ruta);
        return null;
      }
      const modo = fs.statSync(ruta).mode;
      const octal = (modo & 0o777).toString(8);
      const puedeLeer = fs.accessSync(ruta, fs.constants.R_OK) === undefined;
      let puedeEscribir = true, puedeEjecutar = true;
      try { fs.accessSync(ruta, fs.constants.W_OK); } catch { puedeEscribir = false; }
      try { fs.accessSync(ruta, fs.constants.X_OK); } catch { puedeEjecutar = false; }
      return { modo: octal, lectura: true, escritura: puedeEscribir, ejecucion: puedeEjecutar };
    } catch (error) {
      console.error('Error leyendo permisos:', error.message);
      return null;
    }
  }
};

module.exports = archivo;

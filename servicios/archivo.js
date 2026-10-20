/**
 * Servicio de utilidades de archivos de TecnoCorte (síncrono, sobre fs).
 *
 * Expone el objeto `archivo` con operaciones básicas de sistema de archivos:
 * leer, escribir, borrar, agregar líneas de log (en sus tres estilos:
 * síncrono, callback y promesa) y consultar permisos.
 *
 * Todas las operaciones devuelven true/null en vez de lanzar excepciones, y
 * registran el fallo con console.log/console.error. Se usa sobre todo para
 * los logs y para las copias de seguridad.
 */
const fs = require('fs');
const path = require('path');

// Módulo de utilidades para archivos: leer, escribir, borrar, permisos
const archivo = {
  /**
   * Escribe el contenido completo en la ruta indicada.
   * @param {string} ruta Ruta del archivo (se crean las carpetas padre si faltan).
   * @param {string} contenido Texto que se guarda (queda sobrescrito por completo).
   * @returns {boolean} true si se escribió; false si falló.
   */
  // Escribir (sobrescribe; si no existe lo crea)
  escribir(ruta, contenido) {
    try {
      // recursive: crea todas las carpetas intermedias que hagan falta.
      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      fs.writeFileSync(ruta, contenido, 'utf8');
      console.log(`Archivo escrito: ${ruta}`);
      return true;
    } catch (error) {
      console.error('Error escribiendo archivo:', error.message);
      return false;
    }
  },

  /**
   * Lee un archivo completo como texto.
   * @param {string} ruta Ruta del archivo.
   * @returns {string|null} El contenido en utf8, o null si no existe o falla la lectura.
   */
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

  /**
   * Elimina un archivo del disco.
   * @param {string} ruta Ruta del archivo.
   * @returns {boolean} true si se borró; false si no existía o falló.
   */
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

  /**
   * Agrega una línea con fecha al final de un archivo (útil para logs).
   * Cada variante escribe `ISO - mensaje\n` con una API distinta de Node.
   */
  // Agregar al final del archivo (como tu fragmento), en 3 versiones separadas
  agregar: {
    /**
     * Bloquea hasta terminar de escribir (fs.appendFileSync).
     * @param {string} ruta Archivo al que se agrega la línea.
     * @param {string} mensaje Texto de la línea.
     * @returns {boolean} true si se agregó; false si falló.
     */
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

    /**
     * No bloquea; avisa por callback (err = null si salió bien).
     * @param {string} ruta Archivo al que se agrega la línea.
     * @param {string} mensaje Texto de la línea.
     * @param {Function} [callback] Se llama con (err) al terminar; es opcional.
     */
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

    /**
     * Versión con promesa: se usa con await dentro de una función async.
     * @param {string} ruta Archivo al que se agrega la línea.
     * @param {string} mensaje Texto de la línea.
     * @returns {Promise<boolean>} true si se agregó; false si falló.
     */
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

  /**
   * Consulta los permisos de una ruta (lectura, escritura y ejecución).
   * @param {string} ruta Archivo o carpeta a revisar.
   * @returns {object|null} { modo (octal), lectura, escritura, ejecucion }, o null si no existe.
   */
  // Leer permisos (lectura, escritura, ejecución)
  permisos(ruta) {
    try {
      if (!fs.existsSync(ruta)) {
        console.error('El archivo no existe:', ruta);
        return null;
      }
      const modo = fs.statSync(ruta).mode;
      // & 0o777 deja solo los 9 bits de permisos de dueño/grupo/otros (ej: "755").
      const octal = (modo & 0o777).toString(8);
      const puedeLeer = fs.accessSync(ruta, fs.constants.R_OK) === undefined;
      let puedeEscribir = true, puedeEjecutar = true;
      // accessSync lanza excepción si el permiso no está: por eso se prueban por separado.
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

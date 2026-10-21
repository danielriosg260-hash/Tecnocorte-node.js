/**
 * Servicio de logs y auditoría de TecnoCorte.
 *
 * Trabaja sobre dos frentes:
 *  - Archivo de texto `logs/app.log`: escribir, leer y borrar el log plano.
 *  - Base de datos: registrar acciones del panel (RegistroAccion) y errores
 *    del sitio (RegistroError) para que el administrador los revise.
 *
 * Si falla la escritura en base de datos, el detalle cae en el archivo de log
 * para no perder el rastro del problema.
 */
const fs = require('fs');
const path = require('path');
const RegistroAccion = require('../models/registroaccion.model');
const RegistroError = require('../models/registroerror.model');

// Carpeta y archivo del log plano, siempre junto a la raíz del proyecto.
const CARPETA_LOGS = path.join(__dirname, '..', 'logs');
const ARCHIVO_LOG = path.join(CARPETA_LOGS, 'app.log');

/**
 * Escribe una línea con la fecha y el mensaje en el archivo de logs.
 * @param {string} mensaje Texto a registrar (se le agrega la fecha al frente).
 * @returns {boolean} true si se escribió; false si falló.
 */
function escribir(mensaje) {
  // El sistema de archivos de Vercel es efímero y no debe usarse para logs.
  // La plataforma recoge stdout/stderr y permite consultarlo desde Runtime Logs.
  if (process.env.VERCEL) {
    console.log(`[TecnoCorte] ${mensaje}`);
    return true;
  }

  try {
    fs.mkdirSync(CARPETA_LOGS, { recursive: true });
    // Hora de Colombia para que las líneas del log coincidan con el país del negocio.
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    fs.appendFileSync(ARCHIVO_LOG, `[${fecha}] ${mensaje}\n`, 'utf8');
    return true;
  } catch (error) {
    console.error('Error escribiendo el log:', error.message);
    return false;
  }
}

/**
 * Devuelve todo el contenido del archivo de logs.
 * @returns {string} El texto completo, o '' si el archivo no existe o no se puede leer.
 */
function leer() {
  if (process.env.VERCEL) return '';

  try {
    if (!fs.existsSync(ARCHIVO_LOG)) return '';
    return fs.readFileSync(ARCHIVO_LOG, 'utf8');
  } catch (error) {
    console.error('Error leyendo el log:', error.message);
    return '';
  }
}

/**
 * Borra el archivo de logs.
 * @returns {boolean} true si ya no existía o se borró; false si falló.
 */
function borrar() {
  if (process.env.VERCEL) return true;

  try {
    // Si no existe, no hay nada que borrar y se responde true.
    if (fs.existsSync(ARCHIVO_LOG)) fs.unlinkSync(ARCHIVO_LOG);
    return true;
  } catch (error) {
    console.error('Error borrando el log:', error.message);
    return false;
  }
}

/**
 * Guarda en la base de datos una acción importante del panel.
 * @param {object} req Petición de Express (de donde salen usuario, ip y navegador).
 * @param {string} accion Acción realizada (ej: 'crear', 'actualizar').
 * @param {string} [entidad] Nombre de la entidad afectada (reserva, usuario, etc.).
 * @param {string} [entidadId] Id de la entidad afectada.
 * @param {string} [detalle] Texto libre con el detalle; se recorta a 500 caracteres.
 * @returns {Promise<boolean>} true si se guardó; false si falló (y queda anotado en app.log).
 */
async function registrarAccion(req, accion, entidad = '', entidadId = '', detalle = '') {
  try {
    await RegistroAccion.create({
      // Puede ser null cuando la acción ocurre sin sesión (login, por ejemplo).
      actor: req.usuario ? req.usuario._id : null,
      accion,
      entidad,
      entidad_id: String(entidadId || ''),
      detalle: String(detalle || '').slice(0, 500),
      ip: req.ip || '',
      navegador: String(req.get('user-agent') || '').slice(0, 200)
    });

    return true;
  } catch (error) {
    escribir(`No se pudo registrar la acción ${accion}: ${error.message}`);
    return false;
  }
}

/**
 * Guarda un error del sitio para que el administrador lo revise.
 * @param {object} req Petición de Express (ruta, método, ip y navegador).
 * @param {string} codigo Código interno del error; se recorta a 40 caracteres.
 * @param {error} [error] Objeto de error de JS/Express (se extraen status, nombre,
 *   mensaje y stack; todo se trunca para que no explote el tamaño del registro).
 * @returns {Promise<boolean>} true si se guardó; false si falló (y queda anotado en app.log).
 */
async function registrarError(req, codigo, error) {
  try {
    await RegistroError.create({
      codigo: String(codigo || 'ERROR').slice(0, 40),
      codigo_http: Number(error && error.status) || 500,
      ruta: String(req.originalUrl || req.url || '').slice(0, 300),
      metodo: req.method,
      tipo: error ? error.name : '',
      mensaje: String((error && error.message) || '').slice(0, 1000),
      // El stack completo (hasta 4000 caracteres) permite depurar sin volver a reproducir el error.
      detalle: error && error.stack ? String(error.stack).slice(0, 4000) : '',
      usuario: req.usuario ? req.usuario._id : null,
      ip: req.ip || '',
      navegador: String(req.get('user-agent') || '').slice(0, 200)
    });

    return true;
  } catch (saveError) {
    // Si ni la base falla, al menos queda el intento en el archivo de log.
    escribir(`No se pudo guardar el error: ${saveError.message}`);
    return false;
  }
}

// `archivo` se exporta con ese nombre para que las rutas sepan dónde está el log plano.
module.exports = { archivo: ARCHIVO_LOG, borrar, escribir, leer, registrarAccion, registrarError };

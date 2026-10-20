const fs = require('fs');
const path = require('path');
const RegistroAccion = require('../models/registroaccion.model');
const RegistroError = require('../models/registroerror.model');

const CARPETA_LOGS = path.join(__dirname, '..', 'logs');
const ARCHIVO_LOG = path.join(CARPETA_LOGS, 'app.log');

/** Escribe una línea con la fecha y el mensaje en el archivo de logs. */
function escribir(mensaje) {
  try {
    fs.mkdirSync(CARPETA_LOGS, { recursive: true });
    const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    fs.appendFileSync(ARCHIVO_LOG, `[${fecha}] ${mensaje}\n`, 'utf8');
    return true;
  } catch (error) {
    console.error('Error escribiendo el log:', error.message);
    return false;
  }
}

/** Devuelve todo el contenido del archivo de logs. */
function leer() {
  try {
    if (!fs.existsSync(ARCHIVO_LOG)) return '';
    return fs.readFileSync(ARCHIVO_LOG, 'utf8');
  } catch (error) {
    console.error('Error leyendo el log:', error.message);
    return '';
  }
}

/** Borra el archivo de logs. */
function borrar() {
  try {
    if (fs.existsSync(ARCHIVO_LOG)) fs.unlinkSync(ARCHIVO_LOG);
    return true;
  } catch (error) {
    console.error('Error borrando el log:', error.message);
    return false;
  }
}

/** Guarda en la base de datos una acción importante del panel. */
async function registrarAccion(req, accion, entidad = '', entidadId = '', detalle = '') {
  try {
    await RegistroAccion.create({
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

/** Guarda un error del sitio para que el administrador lo revise. */
async function registrarError(req, codigo, error) {
  try {
    await RegistroError.create({
      codigo: String(codigo || 'ERROR').slice(0, 40),
      codigo_http: Number(error && error.status) || 500,
      ruta: String(req.originalUrl || req.url || '').slice(0, 300),
      metodo: req.method,
      tipo: error ? error.name : '',
      mensaje: String((error && error.message) || '').slice(0, 1000),
      detalle: error && error.stack ? String(error.stack).slice(0, 4000) : '',
      usuario: req.usuario ? req.usuario._id : null,
      ip: req.ip || '',
      navegador: String(req.get('user-agent') || '').slice(0, 200)
    });

    return true;
  } catch (saveError) {
    escribir(`No se pudo guardar el error: ${saveError.message}`);
    return false;
  }
}

module.exports = { archivo: ARCHIVO_LOG, borrar, escribir, leer, registrarAccion, registrarError };

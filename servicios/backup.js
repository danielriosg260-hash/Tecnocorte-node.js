/**
 * Servicio de respaldos de la base de datos (TecnoCorte).
 *
 * Qué hace:
 * 1. Cada día a las 00:00 guarda un respaldo de MongoDB con `mongodump`
 *    en su propia carpeta dentro de `backup/` (comprimido con --gzip).
 * 2. Empaqueta el respaldo en un `.zip` con un LEEME.txt (qué es y cómo
 *    restaurarlo) y lo envía por correo al administrador (`EMAIL_USER`),
 *    si pesa menos de 20 MB.
 * 3. Borra las carpetas de backup con más de 30 días.
 * 4. Si algo falla, avisa por correo y deja el error en `logs/app.log`.
 *
 * También se puede ejecutar a mano con: `npm run backup` (sin envío por correo).
 *
 * Requiere `mongodump` y `zip`. En este equipo las herramientas de MongoDB
 * están en `~/mongodb-tools/bin`; el servicio también busca en el PATH.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cron = require('node-cron');

require('dotenv').config();

const log = require('./log');
const { enviarCorreo, escapeHtml } = require('./correo');

// Carpeta donde se guardan los respaldos.
const CARPETA_BACKUP = path.join(__dirname, '..', 'backup');

// Las carpetas más viejas que esto se borran solas (limpieza mensual).
const DIAS_CONSERVACION = 30;

// Gmail no admite adjuntos de más de 25 MB; se deja margen para el logo del correo.
const LIMITE_ADJUNTO_BYTES = 20 * 1024 * 1024;

// Rutas posibles de mongodump: primero la instalación local, luego las del sistema.
const CANDIDATOS_MONGODUMP = [
  path.join(os.homedir(), 'mongodb-tools', 'bin', 'mongodump'),
  '/usr/bin/mongodump',
  '/usr/local/bin/mongodump'
];

// Nombre de la base de datos (igual que usa config/db.js).
const BASE_DATOS = process.env.MONGO_DB_NAME || 'tecnocorte';

// Correo al que llegan los respaldos y las alertas.
const CORREO_ADMIN = process.env.EMAIL_USER;

/**
 * Devuelve la fecha y hora actual en formato AAAA-MM-DD_HH-mm-ss.
 * Se usa como nombre de la carpeta de cada respaldo.
 */
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
 * Convierte el nombre de una carpeta de respaldo (AAAA-MM-DD_HH-mm-ss)
 * en una fecha legible para los correos (DD/MM/AAAA HH:mm).
 */
function fechaLegible(nombreCarpeta) {
  const partes = nombreCarpeta.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})/);
  if (!partes) return nombreCarpeta;
  const [, anio, mes, dia, hora, minuto] = partes;
  return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
}

/** Busca el ejecutable de mongodump.
 * Devuelve la primera ruta que exista o 'mongodump' para que lo resuelva el PATH.
 */
function resolverMongodump() {
  const encontrada = CANDIDATOS_MONGODUMP.find((ruta) => fs.existsSync(ruta));
  return encontrada || 'mongodump';
}

/**
 * Quita la URI (que lleva usuario y contraseña de MongoDB) de cualquier mensaje
 * antes de escribirlo en el log o mandarlo por correo.
 */
function ocultarCredenciales(texto) {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || '';
  let limpio = String(texto || '');
  if (uri) limpio = limpio.split(uri).join('[URI de MongoDB oculta]');
  limpio = limpio.replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, '[URI de MongoDB oculta]');
  return limpio;
}

/** Escribe en consola y en logs/app.log el resultado de un respaldo. */
function registrar(mensaje) {
  console.log(mensaje);
  log.escribir(mensaje);
}

/** Formatea un tamaño de archivo: 512 B, 48 KB o 1.2 MB según corresponda. */
function formatearPeso(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Lista los nombres de las colecciones que incluye un respaldo de mongodump.
 *
 * @param {string} carpeta Carpeta del respaldo (la que creó mongodump).
 * @returns {string[]} Nombres de colecciones, sin repetidos y en orden alfabético.
 */
function listarColecciones(carpeta) {
  const rutaDatos = path.join(carpeta, BASE_DATOS);

  try {
    const nombres = fs
      .readdirSync(rutaDatos)
      .filter((archivo) => archivo.endsWith('.bson.gz'))
      .map((archivo) => archivo.replace(/\.bson\.gz$/, ''))
      .sort();

    return [...new Set(nombres)];
  } catch (error) {
    return [];
  }
}

/** Avisa por correo al administrador cuando un respaldo no se pudo completar. */
async function avisarFallo(motivo) {
  if (!CORREO_ADMIN) return;

  const limpio = escapeHtml(ocultarCredenciales(motivo));

  await enviarCorreo({
    to: CORREO_ADMIN,
    subject: 'Backup de TecnoCorte fallido',
    title: 'Backup fallido',
    preheader: 'El respaldo nocturno de la base de datos no se completó.',
    greeting: 'Hola,',
    content: `
      <p>El respaldo automático de la base de datos de TecnoCorte <strong>no se pudo completar</strong>.</p>
      <div style="margin:26px 0;padding:16px;background:#fdecea;border:1px solid #d93025;border-radius:12px;font-family:monospace;font-size:13px;word-break:break-word">
        ${limpio}
      </div>
      <p>Revisa el servidor y comprueba el respaldo con <code>npm run backup</code>.</p>`,
    text: `El respaldo automático de TecnoCorte falló.\n\nMotivo: ${ocultarCredenciales(motivo)}\n\nRevisa el servidor y comprueba el respaldo con "npm run backup".`
  });
}

/**
 * Genera un respaldo de la base de datos con mongodump.
 * Cada respaldo queda comprimido (--gzip) en su propia carpeta dentro de backup/.
 *
 * @returns {Promise<string|null>} La carpeta donde quedó el respaldo, o null si falló.
 */
exports.backupDatabase = function () {
  return new Promise((resolve) => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;

    if (!uri) {
      registrar('Backup fallido: falta MONGO_URI (o DATABASE_URL) en el .env');
      return resolve(null);
    }

    const binario = resolverMongodump();
    fs.mkdirSync(CARPETA_BACKUP, { recursive: true });

    const destino = path.join(CARPETA_BACKUP, fechaActual());

    execFile(
      binario,
      ['--uri', uri, '--db', BASE_DATOS, '--out', destino, '--gzip'],
      (error, stdout, stderr) => {
        if (error) {
          let motivo = ocultarCredenciales(error.message);

          if (error.code === 'ENOENT') {
            motivo = `No se encontró mongodump. Instálalo con "sudo apt-get install mongodb-database-tools" o descárgalo en ${path.join(os.homedir(), 'mongodb-tools')}`;
          } else if (stderr) {
            motivo = ocultarCredenciales(stderr);
          }

          registrar(`Backup fallido: ${motivo}`);

          avisarFallo(motivo).catch((correoError) => {
            console.error('No se pudo enviar el aviso del backup:', correoError.message);
          });

          return resolve(null);
        }

        registrar(`Respaldo completado con éxito en: ${destino} (base de datos: ${BASE_DATOS})`);
        if (stdout) console.log(stdout);
        resolve(destino);
      }
    );
  });
};

/**
 * Texto del LEEME.txt que viaja dentro del .zip del respaldo.
 * Explica qué contiene el archivo y cómo restaurarlo.
 *
 * @param {{ fecha: string, colecciones: string[] }} info
 * @returns {string}
 */
function crearLeeme({ fecha, colecciones }) {
  const lista = colecciones.length > 0 ? colecciones.join(', ') : '(no se pudo leer la lista)';

  return `RESPALDO DE LA BASE DE DATOS - TECNOCORTE
==========================================

Fecha del respaldo : ${fecha}
Base de datos      : ${BASE_DATOS}
Colecciones        : ${colecciones.length} (${lista})
Generado por       : TecnoCorte (automático, cada noche a las 00:00)

QUE CONTIENE ESTE ARCHIVO
-------------------------
LEEME.txt            este archivo.
datos/${BASE_DATOS}/   volcado de MongoDB generado con mongodump y
                     comprimido con gzip. Hay dos archivos por coleccion:

  *.bson.gz           los datos de la coleccion
  *.metadata.json.gz  los indices y la configuracion de la coleccion

COMO RESTAURARLO
-----------------
1. Descomprime este archivo .zip.
2. Restaurar sobre una base de datos de PRUEBA (recomendado):

   mongorestore --gzip --dir datos/ \\
     --nsFrom "${BASE_DATOS}.*" --nsTo "${BASE_DATOS}_prueba.*" \\
     --uri "<tu URI de MongoDB>"

3. Restaurar sobre la base de datos original:

   mongorestore --gzip --dir datos/ --uri "<tu URI de MongoDB>"

4. Comprobar en mongosh que las colecciones cargaron:

   mongosh --eval "show dbs"

NOTAS
-----
- El respaldo tambien queda en el servidor, en la carpeta "backup/".
- Por correo solo se envia si pesa menos de 20 MB.
- No compartas este archivo: contiene todos los datos del sistema.
`;
}

/**
 * Empaqueta la carpeta de un respaldo en un .zip listo para enviar:
 *
 *   backup-tecnocorte-AAAA-MM-DD_HH-mm-ss.zip
 *   ├── LEEME.txt        (qué es y cómo restaurar)
 *   └── datos/           (el volcado de mongodump, con una carpeta por base de datos)
 *
 * @param {string} carpeta Carpeta del respaldo (la que creó mongodump).
 * @param {string[]} colecciones Nombres de las colecciones del respaldo.
 * @returns {Promise<string|null>} La ruta del .zip o null si falló.
 */
function empaquetarBackup(carpeta, colecciones) {
  return new Promise((resolve) => {
    const nombre = path.basename(carpeta);
    const archivo = path.join(os.tmpdir(), `backup-tecnocorte-${nombre}.zip`);
    const carpetaTemporal = path.join(os.tmpdir(), `tecnocorte-zip-${nombre}`);

    try {
      // Se arma la estructura del zip en una carpeta temporal:
      //   carpetaTemporal/backup-tecnocorte-.../{LEEME.txt, datos/tecnocorte/}
      // mongorestore espera que dentro de --dir haya una carpeta por base de datos.
      const raiz = path.join(carpetaTemporal, `backup-tecnocorte-${nombre}`);
      fs.mkdirSync(path.join(raiz, 'datos'), { recursive: true });
      fs.cpSync(carpeta, path.join(raiz, 'datos'), { recursive: true });

      const leeme = `backup-tecnocorte-${nombre}/LEEME.txt`;
      fs.writeFileSync(path.join(raiz, 'LEEME.txt'), crearLeeme({ fecha: fechaLegible(nombre), colecciones }), 'utf8');

      execFile('zip', ['-r', '-q', archivo, `backup-tecnocorte-${nombre}`], { cwd: carpetaTemporal }, (error) => {
        fs.rmSync(carpetaTemporal, { recursive: true, force: true });

        if (error) {
          registrar(`No se pudo empaquetar el respaldo en .zip: ${error.message}`);
          return resolve(null);
        }

        resolve(archivo);
      });
    } catch (error) {
      fs.rmSync(carpetaTemporal, { recursive: true, force: true });
      registrar(`No se pudo preparar el .zip del respaldo: ${error.message}`);
      return resolve(null);
    }
  });
}

/**
 * Envía el respaldo empaquetado al correo del administrador.
 * No envía nada si el archivo supera el límite de Gmail (20 MB).
 *
 * @param {string} archivo Ruta del .zip a adjuntar.
 * @param {{ fecha: string, fechaLegible: string, colecciones: string[] }} info
 * @returns {Promise<boolean>} true si el correo salió.
 */
async function enviarBackupPorCorreo(archivo, info) {
  if (!CORREO_ADMIN) {
    registrar('Respaldo no enviado por correo: falta EMAIL_USER en el .env');
    return false;
  }

  const peso = fs.statSync(archivo).size;

  if (peso > LIMITE_ADJUNTO_BYTES) {
    registrar(
      `Respaldo de ${formatearPeso(peso)}: no se envía por correo (supera el límite de ${formatearPeso(LIMITE_ADJUNTO_BYTES)}); sigue disponible en ${CARPETA_BACKUP}`
    );
    return false;
  }

  const listaColecciones = info.colecciones.length
    ? info.colecciones.map((nombre) => `<li style="margin: 4px 0">${escapeHtml(nombre)}</li>`).join('')
    : '<li style="margin: 4px 0; color: #817b70">(no disponible)</li>';

  const contenido = `
    <p>Esta noche se generó el respaldo automático de la base de datos. Lo encontrarás adjunto en formato <strong>.zip</strong>.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0; background: #1c1a16; border: 1px solid #302b22; border-radius: 12px">
      <tr>
        <td style="padding: 18px 22px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="color: #d5d0c7; font-size: 14px">
            <tr>
              <td style="padding: 5px 0; color: #817b70; width: 150px">FECHA</td>
              <td style="padding: 5px 0; color: #f5f1e8"><strong>${escapeHtml(info.fechaLegible)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #817b70">BASE DE DATOS</td>
              <td style="padding: 5px 0; color: #f5f1e8">${escapeHtml(BASE_DATOS)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #817b70">COLECCIONES</td>
              <td style="padding: 5px 0; color: #f5f1e8">${info.colecciones.length}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #817b70">TAMAÑO DEL ARCHIVO</td>
              <td style="padding: 5px 0; color: #f5f1e8">${formatearPeso(peso)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #817b70; vertical-align: top">CONTIENE</td>
              <td style="padding: 5px 0">
                <ul style="margin: 0; padding-left: 18px">${listaColecciones}</ul>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px"><strong style="color: #d6a84f">CÓMO RESTAURARLO</strong></p>
    <p style="margin: 0 0 10px; font-size: 14px">Descomprime el .zip y dentro encontrarás un archivo <code>LEEME.txt</code> con los pasos. Resumen:</p>
    <pre style="margin: 0 0 20px; padding: 14px 16px; background: #0f0f0f; border: 1px solid #302b22; border-radius: 10px; color: #d5d0c7; font-size: 12px; line-height: 1.6; overflow-x: auto">mongorestore --gzip --dir datos/ \\
  --nsFrom "${BASE_DATOS}.*" --nsTo "${BASE_DATOS}_prueba.*" \\
  --uri "&lt;tu URI de MongoDB&gt;"</pre>

    <p style="color: #817b70; font-size: 13px">El respaldo también queda en el servidor, en la carpeta <code>backup/</code>. No compartas este archivo: contiene todos los datos del sistema.</p>`;

  const enviado = await enviarCorreo({
    to: CORREO_ADMIN,
    subject: `Backup nocturno de TecnoCorte (${info.fecha})`,
    title: 'Backup nocturno',
    preheader: `Respaldo de la base de datos del ${info.fechaLegible}, ${info.colecciones.length} colecciones, ${formatearPeso(peso)}.`,
    greeting: 'Hola,',
    content: contenido,
    text: `Respaldo nocturno de TecnoCorte (${info.fechaLegible}).\n\nBase de datos: ${BASE_DATOS}\nColecciones: ${info.colecciones.length}\nTamaño: ${formatearPeso(peso)}\n\nEl .zip contiene una carpeta "datos/${BASE_DATOS}/" con el volcado de mongodump y un LEEME.txt con los pasos para restaurarlo.\n\nRestaurar en una base de datos de prueba:\nmongorestore --gzip --dir datos/ --nsFrom "${BASE_DATOS}.*" --nsTo "${BASE_DATOS}_prueba.*" --uri "<tu URI de MongoDB>"`,
    attachments: [{ filename: path.basename(archivo), path: archivo }]
  });

  if (enviado) {
    registrar(`Respaldo enviado por correo a ${CORREO_ADMIN} (${formatearPeso(peso)})`);
    return true;
  }

  registrar('No se pudo enviar el respaldo por correo (revisa EMAIL_USER y EMAIL_PASS en el .env)');
  return false;
}

/**
 * Borra las carpetas de backup con más de DIAS_CONSERVACION días.
 * Se ejecuta después de cada respaldo nocturno.
 *
 * @returns {number} Cantidad de carpetas borradas.
 */
function limpiarBackupsAntiguos() {
  try {
    if (!fs.existsSync(CARPETA_BACKUP)) return 0;

    const limite = Date.now() - DIAS_CONSERVACION * 24 * 60 * 60 * 1000;
    let borradas = 0;

    for (const entrada of fs.readdirSync(CARPETA_BACKUP, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;

      const carpeta = path.join(CARPETA_BACKUP, entrada.name);
      if (fs.statSync(carpeta).mtimeMs < limite) {
        fs.rmSync(carpeta, { recursive: true, force: true });
        borradas += 1;
      }
    }

    if (borradas > 0) {
      registrar(`Limpieza de backups: se borraron ${borradas} carpetas con más de ${DIAS_CONSERVACION} días`);
    }

    return borradas;
  } catch (error) {
    console.error('No se pudieron limpiar los backups antiguos:', error.message);
    return 0;
  }
}

/**
 * Rutina completa de una noche: respaldo, empaquetado .zip, envío por correo
 * y limpieza. Se usa desde el cron; también sirve para probar a mano.
 *
 * @returns {Promise<boolean>} true si el respaldo se completó.
 */
async function ejecutarRespaldoNocturno() {
  const destino = await exports.backupDatabase();

  if (destino) {
    const fecha = path.basename(destino);
    const colecciones = listarColecciones(destino);
    const paquete = await empaquetarBackup(destino, colecciones);

    if (paquete) {
      try {
        await enviarBackupPorCorreo(paquete, { fecha, fechaLegible: fechaLegible(fecha), colecciones });
      } finally {
        // El .zip es solo para el correo; el respaldo ya está en su carpeta.
        fs.rmSync(paquete, { force: true });
      }
    }
  }

  limpiarBackupsAntiguos();
  return Boolean(destino);
}

/**
 * Programa el respaldo para todos los días a las 12:00 de la noche.
 * Se llama desde index.js cuando arranca el servidor.
 */
exports.iniciarBackup = function () {
  cron.schedule('0 0 0 * * *', async () => {
    registrar('Backup nocturno iniciado');
    const ok = await ejecutarRespaldoNocturno();
    if (ok) registrar('Backup nocturno finalizado');
  });

  console.log(
    `Backup programado: todos los días a las 00:00 (se conservan ${DIAS_CONSERVACION} días${CORREO_ADMIN ? `; se envía a ${CORREO_ADMIN} si pesa menos de ${LIMITE_ADJUNTO_BYTES / 1024 / 1024} MB` : ''})`
  );
};

exports.ejecutarRespaldoNocturno = ejecutarRespaldoNocturno;
exports.enviarBackupPorCorreo = enviarBackupPorCorreo;
exports.empaquetarBackup = empaquetarBackup;
exports.listarColecciones = listarColecciones;
exports.limpiarBackupsAntiguos = limpiarBackupsAntiguos;
exports.DIAS_CONSERVACION = DIAS_CONSERVACION;

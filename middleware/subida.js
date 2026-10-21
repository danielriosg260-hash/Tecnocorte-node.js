/** Subida de imágenes: disco local en desarrollo y Vercel Blob en producción. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { put } = require('@vercel/blob');

const CARPETA = path.join(__dirname, '..', 'public', 'uploads');
if (!process.env.VERCEL && !fs.existsSync(CARPETA)) fs.mkdirSync(CARPETA, { recursive: true });

const EXTENSIONES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const usarBlob = Boolean(process.env.VERCEL);
const almacenamiento = usarBlob
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, CARPETA),
      filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSIONES[file.mimetype]}`)
    });

const filtro = (req, file, cb) => cb(null, Boolean(EXTENSIONES[file.mimetype]));

async function guardarBlob(file) {
  const nombre = `uploads/${crypto.randomUUID()}${EXTENSIONES[file.mimetype]}`;
  const blob = await put(nombre, file.buffer, { access: 'public', contentType: file.mimetype });
  file.url = blob.url;
  file.public_id = blob.pathname;
  return file;
}

async function prepararArchivos(archivos) {
  if (!usarBlob) return;
  for (const archivo of archivos) await guardarBlob(archivo);
}

function ejecutarSubida(parser, mensaje) {
  return (req, res, next) => {
    parser(req, res, async (error) => {
      if (error) return res.status(400).send(mensaje);
      try {
        await prepararArchivos(req.files || (req.file ? [req.file] : []));
        next();
      } catch (blobError) {
        console.error('No se pudo guardar la imagen:', blobError.message);
        return res.status(503).send('El almacenamiento de imágenes no está disponible.');
      }
    });
  };
}

function crearSubida(cantidad) {
  return multer({
    storage: almacenamiento,
    fileFilter: filtro,
    limits: { fileSize: 2 * 1024 * 1024, files: cantidad }
  });
}

function urlSubida(file) {
  if (!file) return '';
  return file.url || `/uploads/${file.filename}`;
}

const subirFoto = ejecutarSubida(crearSubida(1).single('foto'), 'La imagen debe ser JPG, PNG o WebP y pesar menos de 2 MB.');
const subirObras = ejecutarSubida(crearSubida(6).array('obras', 6), 'Puedes subir hasta 6 imágenes JPG, PNG o WebP de menos de 2 MB.');
const subirImagen = ejecutarSubida(crearSubida(1).single('imagen'), 'La imagen debe ser JPG, PNG o WebP y pesar menos de 2 MB.');

module.exports = { subirFoto, subirImagen, subirObras, urlSubida, CARPETA };

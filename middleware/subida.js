/**
 * Subida de imágenes con Multer.
 * Guarda fotos de perfil, de peluquerías, productos y galería en
 * public/uploads con nombre aleatorio, limitando tipo y tamaño.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Carpeta donde se guardan las fotos que suben los usuarios.
const CARPETA = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(CARPETA)) fs.mkdirSync(CARPETA, { recursive: true });

// Tipos de imagen aceptados y su extensión de archivo.
const EXTENSIONES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

// Los archivos se guardan en la carpeta pública con un nombre aleatorio
// para no revelar datos del usuario ni pisar archivos existentes.
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSIONES[file.mimetype]}`)
});

// Rechaza cualquier archivo que no sea JPG, PNG o WebP.
const filtro = (req, file, cb) => cb(null, Boolean(EXTENSIONES[file.mimetype]));

// Fábrica de instancias de Multer con un máximo de archivos y 2 MB por imagen.
function crearSubida(cantidad) {
  return multer({
    storage: almacenamiento,
    fileFilter: filtro,
    limits: { fileSize: 2 * 1024 * 1024, files: cantidad }
  });
}

/** Sube una sola foto en el campo "foto". */
function subirFoto(req, res, next) {
  crearSubida(1).single('foto')(req, res, (error) => {
    if (error) {
      // Error de Multer (tipo no admitido, peso o número de archivos).
      return res.status(400).send('La imagen debe ser JPG, PNG o WebP y pesar menos de 2 MB.');
    }
    next();
  });
}

/** Sube hasta 6 fotos del portafolio en el campo "obras". */
function subirObras(req, res, next) {
  crearSubida(6).array('obras', 6)(req, res, (error) => {
    if (error) {
      return res.status(400).send('Puedes subir hasta 6 imágenes JPG, PNG o WebP de menos de 2 MB.');
    }
    next();
  });
}

/** Sube una sola foto en el campo "imagen" (peluquerías, productos y galería). */
function subirImagen(req, res, next) {
  crearSubida(1).single('imagen')(req, res, (error) => {
    if (error) {
      // Error de Multer (tipo no admitido, peso o número de archivos).
      return res.status(400).send('La imagen debe ser JPG, PNG o WebP y pesar menos de 2 MB.');
    }
    next();
  });
}

// Se exportan los tres middlewares de subida y la carpeta de destino.
module.exports = { subirFoto, subirImagen, subirObras, CARPETA };

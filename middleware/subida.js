const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Carpeta donde se guardan las fotos que suben los usuarios.
const CARPETA = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(CARPETA)) fs.mkdirSync(CARPETA, { recursive: true });

const EXTENSIONES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CARPETA),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXTENSIONES[file.mimetype]}`)
});

const filtro = (req, file, cb) => cb(null, Boolean(EXTENSIONES[file.mimetype]));

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
      return res.status(400).send('La imagen debe ser JPG, PNG o WebP y pesar menos de 2 MB.');
    }
    next();
  });
}

module.exports = { subirFoto, subirImagen, subirObras, CARPETA };

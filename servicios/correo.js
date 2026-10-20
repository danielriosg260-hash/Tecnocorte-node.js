const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

// Ruta del logo que se adjunta a los correos.
const RUTA_LOGO = path.join(__dirname, '..', 'public', 'images', 'Logo.png');
const RUTA_PLANTILLA = path.join(__dirname, '..', 'views', 'emails', 'notificacion.ejs');
const ID_LOGO = 'tecnocorte-logo';

// Servicio de envío de correos. Se puede usar desde cualquier controlador.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    // Google muestra la contraseña de aplicación con espacios.
    pass: (process.env.EMAIL_PASS || '').replace(/\s/g, '')
  }
});

/** Escapa texto para que no se interprete como HTML dentro del correo. */
function escapeHtml(valor = '') {
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Arma la plantilla HTML que comparten todos los correos. */
function crearPlantilla({ title, preheader = '', greeting = '', content = '', action = null }) {
  const hayLogo = fs.existsSync(RUTA_LOGO);
  const logo = hayLogo ? `cid:${ID_LOGO}` : `${process.env.APP_URL || ''}/images/Logo.png`;

  return ejs.render(fs.readFileSync(RUTA_PLANTILLA, 'utf8'), {
    asunto: title || 'TecnoCorte',
    preheader,
    saludo: greeting,
    contenido: content,
    enlace: action && action.url ? action.url : '',
    texto_enlace: action && action.label ? action.label : '',
    logo_url: logo
  });
}

/**
 * Envía un correo con la plantilla del proyecto.
 * Devuelve la respuesta de nodemailer o null si no hay credenciales.
 */
async function enviarCorreo({ to, subject, title, preheader, greeting, content, action, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Correo no enviado: faltan EMAIL_USER y EMAIL_PASS');
    return null;
  }

  const opciones = {
    from: `TecnoCorte <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: crearPlantilla({ title, preheader, greeting, content, action }),
    text: [greeting, text, action && action.url ? `${action.label}: ${action.url}` : ''].filter(Boolean).join('\n\n')
  };

  if (fs.existsSync(RUTA_LOGO)) {
    opciones.attachments = [{ filename: 'Logo.png', path: RUTA_LOGO, cid: ID_LOGO }];
  }

  try {
    return await transporter.sendMail(opciones);
  } catch (error) {
    // Un correo que no sale no debe tumbar la página que lo pidió.
    console.error(`No se pudo enviar el correo a ${to}: ${error.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verificación de correo
// ---------------------------------------------------------------------------

function generarCodigo() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashCodigo(codigo) {
  return crypto.createHash('sha256').update(String(codigo)).digest('hex');
}

/** Guarda en el usuario un código de verificación válido por 15 minutos. */
async function guardarCodigo(usuario) {
  const codigo = generarCodigo();
  usuario.email_verificacion_token = hashCodigo(codigo);
  usuario.email_verificacion_expira = new Date(Date.now() + 15 * 60 * 1000);
  await usuario.save();
  return codigo;
}

/** Compara el código escrito por el usuario con el guardado. */
function verificarCodigo(usuario, codigo) {
  if (!usuario || !usuario.email_verificacion_token || !usuario.email_verificacion_expira) return false;
  if (usuario.email_verificacion_expira < new Date()) return false;

  const guardado = Buffer.from(usuario.email_verificacion_token);
  const recibido = Buffer.from(hashCodigo(codigo));

  return guardado.length === recibido.length && crypto.timingSafeEqual(guardado, recibido);
}

/** Envía el código de 6 dígitos al correo del usuario. */
async function enviarCodigoVerificacion(usuario, codigo) {
  return enviarCorreo({
    to: usuario.email,
    subject: 'Verifica tu correo de TecnoCorte',
    title: 'Verifica tu correo',
    preheader: 'Tu código de verificación vence en 15 minutos.',
    greeting: `Hola ${usuario.nombre},`,
    content: `
      <p>Para activar tu cuenta necesitamos confirmar que este correo te pertenece.</p>
      <div style="margin:26px 0;padding:18px;text-align:center;background:#f3ead6;border:1px solid #d6ad42;border-radius:12px">
        <span style="display:block;color:#81786b;font-size:12px;letter-spacing:2px;font-weight:700">CÓDIGO DE VERIFICACIÓN</span>
        <strong style="display:block;margin-top:8px;color:#6d5314;font-size:34px;letter-spacing:8px">${codigo}</strong>
      </div>
      <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
    text: `Tu código de verificación de TecnoCorte es ${codigo}. Vence en 15 minutos.`
  });
}

module.exports = {
  enviarCodigoVerificacion,
  enviarCorreo,
  escapeHtml,
  guardarCodigo,
  transporter,
  verificarCodigo
};

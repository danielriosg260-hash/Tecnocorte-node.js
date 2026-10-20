const Mensaje = require('../models/mensaje.model');
const Peluqueria = require('../models/peluqueria.model');
const Calificacion = require('../models/calificacion.model');
const Configuracion = require('../models/configuracion.model');
const ImagenPeluqueria = require('../models/imagengaleria.model');
const Notificacion = require('../models/notificacion.model');
const Usuario = require('../models/usuario.model');
const { enviarCorreo, escapeHtml } = require('../services/correo');
const { catalogoServicios, contenidoInicio, resenasRestantes } = require('../services/catalogo');
const { TIPOS_MENSAJE } = require('../config/constantes');
const { aLista, aObjeto, normalizarEmail, panelDe } = require('../utils/objetos');

/** Agrupa las fotos de la galería por barbería. */
async function galeriasPorPeluqueria(peluquerias) {
  const fotos = await ImagenPeluqueria.find({
    peluqueria: { $in: peluquerias.map((peluqueria) => peluqueria.id) }
  }).sort({ createdAt: -1 });

  return peluquerias.map((peluqueria) => ({
    ...peluqueria,
    fotos: fotos
      .filter((foto) => String(foto.peluqueria) === peluqueria.id)
      .map(aObjeto)
  }));
}

/**
 * Página principal. El admin y el barbero van directo a su panel, salvo que
 * abran el inicio con ?vista=publica para revisarlo.
 */
async function inicio(req, res) {
  if (req.usuario && req.query.vista !== 'publica') {
    return res.redirect(panelDe(req.usuario));
  }

  const config = await Configuracion.cargar();
  const contexto = await contenidoInicio();

  if (req.usuario && req.usuario.rol === 'Cliente') {
    contexto.resenas_restantes = await resenasRestantes(req.usuario._id);
    contexto.puede_resenar = contexto.resenas_restantes > 0;
  }

  return res.render('publicos/index', {
    layout: false,
    active: 'inicio',
    config,
    ...contexto
  });
}

/** Catálogo de servicios de barbería. */
async function servicios(req, res) {
  return res.render('usuarios/usuario_servicios', {
    layout: false,
    active: 'servicios',
    servicios: await catalogoServicios()
  });
}

/** Listado de barberías (sedes). */
async function peluquerias(req, res) {
  const config = await Configuracion.cargar();
  const lista = aLista(await Peluqueria.find().sort({ nombre: 1 }));

  return res.render('usuarios/usuario_peluquerias', {
    layout: false,
    active: 'barberias',
    config: aObjeto(config),
    peluquerias: await galeriasPorPeluqueria(lista)
  });
}

/** Detalle de una barbería con sus fotos y barberos. */
async function detallePeluqueria(req, res) {
  const peluqueria = await Peluqueria.findById(req.params.id);

  if (!peluqueria) return res.redirect('/peluquerias');

  const [config, barberos, fotos] = await Promise.all([
    Configuracion.cargar(),
    Usuario.find({ peluqueria_id: peluqueria._id, rol: 'Barbero', activo: { $ne: false } }).select('nombre apellido foto'),
    ImagenPeluqueria.find({ peluqueria: peluqueria._id }).sort({ createdAt: -1 })
  ]);

  return res.render('usuarios/usuario_peluqueria_detalle', {
    layout: false,
    active: 'barberias',
    config: aObjeto(config),
    peluqueria: aObjeto(peluqueria),
    barberos: aLista(barberos),
    fotos: aLista(fotos)
  });
}

/** Muestra el formulario de contacto con los datos que ya había escrito. */
async function mostrarAyuda(req, res, error = '', exito = '', valores = {}) {
  const config = await Configuracion.cargar();
  const datos = req.usuario
    ? { nombre: req.usuario.nombre, email: req.usuario.email }
    : {};

  return res.render('publicos/ayuda', {
    layout: false,
    active: 'contactos',
    config: aObjeto(config),
    tipos_mensaje: TIPOS_MENSAJE,
    prefill_nombre: datos.nombre || '',
    prefill_email: datos.email || '',
    valores,
    error,
    exito,
    form_post: valores && Object.keys(valores).length ? new URLSearchParams(valores).toString() : ''
  });
}

/** Guarda el mensaje de contacto y avisa al administrador. */
async function ayuda(req, res) {
  const valores = {
    nombre: String(req.body.nombre || '').trim(),
    email: normalizarEmail(req.body.email),
    tipo: String(req.body.tipo || '').trim(),
    mensaje: String(req.body.mensaje || '').trim()
  };

  const tipo = TIPOS_MENSAJE.find(([valor]) => valor === valores.tipo);

  if (!valores.nombre || !valores.email || !valores.mensaje) {
    return res.status(400).render('publicos/ayuda', {
      layout: false,
      active: 'contactos',
      config: aObjeto(await Configuracion.cargar()),
      tipos_mensaje: TIPOS_MENSAJE,
      prefill_nombre: '',
      prefill_email: '',
      valores,
      error: 'Completa todos los campos.',
      exito: '',
      form_post: new URLSearchParams(valores).toString()
    });
  }

  if (!tipo) {
    return res.status(400).render('publicos/ayuda', {
      layout: false,
      active: 'contactos',
      config: aObjeto(await Configuracion.cargar()),
      tipos_mensaje: TIPOS_MENSAJE,
      prefill_nombre: '',
      prefill_email: '',
      valores,
      error: 'Elige un tipo de mensaje de la lista.',
      exito: '',
      form_post: new URLSearchParams(valores).toString()
    });
  }

  await Mensaje.create({
    nombre: valores.nombre,
    email: valores.email,
    asunto: tipo[1],
    tipo: tipo[0],
    mensaje: valores.mensaje
  });

  const administradores = await Usuario.find({ rol: 'Admin', activo: { $ne: false } }).select('_id');

  if (administradores.length) {
    await Notificacion.insertMany(
      administradores.map((admin) => ({
        usuario: admin._id,
        tipo: 'sistema',
        titulo: 'Nuevo mensaje de contacto',
        mensaje: `Nuevo mensaje de contacto: ${tipo[1]}.`
      }))
    );
  }

  await enviarCorreo({
    to: process.env.EMAIL_USER,
    subject: `[TecnoCorte] ${tipo[1]}`,
    title: tipo[1],
    preheader: 'Nuevo mensaje recibido desde el formulario de contacto.',
    greeting: `Mensaje de ${valores.nombre}`,
    content: `<p>${escapeHtml(valores.mensaje).replace(/\n/g, '<br>')}</p><p><strong>Correo de contacto:</strong> ${escapeHtml(valores.email)}</p>`,
    text: valores.mensaje
  });

  return mostrarAyuda(req, res, '', 'Tu mensaje fue enviado. Te responderemos pronto.');
}

/** Página de políticas de privacidad. */
function politicas(req, res) {
  return res.render('publicos/politicas', { title: 'Políticas - TecnoCorte', active: '' });
}

function comoFunciona(req, res) {
  return res.render('publicos/como_funciona', { title: 'Cómo Funciona - TecnoCorte', active: '' });
}

function sobreNosotros(req, res) {
  return res.render('publicos/sobre_nosotros', { title: 'Sobre Nosotros - TecnoCorte', active: '' });
}

/** Página de agradecimiento cuando el cliente deja una reseña. */
async function dejarResena(req, res) {
  const puntuacion = Number(req.body.puntuacion);
  const comentario = String(req.body.comentario || '').slice(0, 1000);

  const restantes = await resenasRestantes(req.usuario._id);
  if (restantes <= 0) return res.redirect('/');

  if (Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5) {
    await Calificacion.create({
      cliente: req.usuario._id,
      puntuacion,
      comentario
    });
  }

  return res.redirect('/#resenas');
}

module.exports = {
  ayuda,
  comoFunciona,
  dejarResena,
  detallePeluqueria,
  inicio,
  mostrarAyuda,
  peluquerias,
  politicas,
  servicios,
  sobreNosotros
};

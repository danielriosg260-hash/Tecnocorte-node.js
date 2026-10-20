// Utilidades para convertir documentos de mongoose en datos listos para las
// vistas y para normalizar entradas comunes (correo, redirecciones, errores).

const { CATEGORIAS, DIAS, TIPOS_MENSAJE } = require('../config/constantes');

/** Traduce el valor de una lista de opciones a su texto visible. */
function etiqueta(opciones, valor) {
  const opcion = opciones.find(([clave]) => clave === valor);
  return opcion ? opcion[1] : valor || '';
}

/**
 * Convierte un documento de mongoose en un objeto sencillo para las vistas.
 * Agrega la propiedad "id" y conserva las virtuales del modelo.
 */
function aObjeto(documento) {
  if (!documento) return null;

  const valor = typeof documento.toObject === 'function'
    ? documento.toObject({ virtuals: true })
    : { ...documento };

  valor.id = String(valor._id || valor.id || '');

  if (valor.peluqueria_id) valor.peluqueria_id = String(valor.peluqueria_id);
  if (valor.dueno) valor.dueno_id = String(valor.dueno);

  // Campos que en las vistas se muestran con su nombre legible.
  if (valor.categoria) valor.categoria_display = etiqueta(CATEGORIAS, valor.categoria);
  if (valor.dia_semana !== undefined) valor.dia_semana_display = DIAS[valor.dia_semana] || '';
  if (valor.tipo) valor.tipo_display = etiqueta(TIPOS_MENSAJE, valor.tipo);

  return valor;
}

/** Convierte una lista de documentos en una lista de objetos sencillos. */
function aLista(documentos) {
  return documentos.map(aObjeto);
}

/** Deja el correo en minúsculas y sin espacios. */
function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/** Traduce los errores más comunes de mongoose a un mensaje para el usuario. */
function mensajeError(error) {
  if (!error) return 'No se pudo completar la operación.';
  if (error.code === 11000) return 'El correo ya está registrado.';
  if (error.name === 'ValidationError') return 'Revisa los datos ingresados.';
  return error.message || 'No se pudo completar la operación.';
}

/** Evita que el parámetro "next" del login saque al usuario del sitio. */
function urlSegura(valor) {
  return typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/';
}

/** Devuelve la página de inicio según el rol del usuario. */
function panelDe(usuario) {
  if (!usuario) return '/';
  if (usuario.rol === 'Admin') return '/admin';
  if (usuario.rol === 'Barbero') return '/barbero';
  return '/perfil';
}

module.exports = { aLista, aObjeto, etiqueta, mensajeError, normalizarEmail, panelDe, urlSegura };

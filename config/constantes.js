/**
 * Constantes y listas de opciones compartidas por controladores y vistas.
 * Cada lista de opciones es un arreglo de pares [valor guardado, texto visible].
 * Aquí también viven las reglas de transición de estados de citas y pedidos.
 */

// Servicios que ofrece la barbería. Se usan en las citas y en los reportes.
// Catálogo base con precios y duraciones fijas; se lee en servicios/catalogo.js
// y se muestra en el panel del barbero.
const SERVICIOS = [
  {
    nombre: 'Corte de Cabello',
    precio: 40000,
    duracion: '45 min',
    minutos: 45,
    descripcion: 'Corte personalizado y acabado profesional.'
  },
  {
    nombre: 'Arreglo de Barba',
    precio: 30000,
    duracion: '30 min',
    minutos: 30,
    descripcion: 'Perfilado, toalla caliente y cuidado de la barba.'
  },
  {
    nombre: 'Combo Completo',
    precio: 60000,
    duracion: '75 min',
    minutos: 75,
    descripcion: 'Corte de cabello y arreglo de barba.'
  }
];

// Roles del sistema en formato [clave, texto]; el tercero se muestra como
// "Administrador" en los formularios. Se valida en controllers/admin.controller.js.
const ROLES = [
  ['Cliente', 'Cliente'],
  ['Barbero', 'Barbero'],
  ['Admin', 'Administrador']
];

// Categorías de productos de la tienda: [clave guardada, título con acentos].
// Se valida al crear productos y se traduce en utils/objetos.js (categoria_display).
const CATEGORIAS = [
  ['Herramientas', 'Herramientas'],
  ['Fijacion', 'Fijación & Textura'],
  ['Cuidado', 'Cuidado Capilar'],
  ['Barba', 'Barba & Afeitado']
];

// Estados de las citas para filtros y selects (sin "Reprogramar",
// que es interno del modelo). Se usa en admin, cita y reserva controllers.
const ESTADOS_RESERVA = [
  ['Pendiente', 'Pendiente'],
  ['Confirmada', 'Confirmada'],
  ['Completada', 'Completada'],
  ['Cancelada', 'Cancelada']
];

// Nombres de los días empezando por lunes; coincide con dia_semana 0..6
// del modelo Horario. Se muestra en la agenda del barbero.
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Tipos de mensaje del formulario de contacto.
const TIPOS_MENSAJE = [
  ['consulta', 'Consulta general'],
  ['soporte', 'Soporte técnico'],
  ['cita', 'Problema con una cita'],
  ['pedido', 'Pedidos y tienda'],
  ['cuenta', 'Cuenta y acceso'],
  ['denuncia', 'Denuncia o queja'],
  ['otro', 'Otro']
];

// Duraciones que puede tener un servicio creado por un barbero.
// Valores en minutos aceptados al editar un servicio (controllers/barbero.controller.js).
const DURACIONES_SERVICIO = [15, 20, 30, 45, 60, 75, 90, 120];

// Estados a los que puede pasar una cita. Evita saltos sin sentido.
const TRANSICIONES_RESERVA = {
  Pendiente: ['Pendiente', 'Confirmada', 'Cancelada'],
  Confirmada: ['Confirmada', 'Completada', 'Cancelada'],
  Completada: ['Completada'],
  Cancelada: ['Cancelada', 'Pendiente']
};

// Estados a los que puede pasar un pedido.
const TRANSICIONES_PEDIDO = {
  Pendiente: ['Pendiente', 'Listo', 'Entregado', 'Cancelado'],
  Listo: ['Listo', 'Entregado', 'Cancelado'],
  Entregado: ['Entregado'],
  Cancelado: ['Cancelado']
};

// Pestañas de la zona de configuración del cliente.
// (Nota: los controladores cliente/barbero hoy definen su propia copia de
// estas listas; esta constante queda exportada por compatibilidad.)
const PESTANAS_CONFIG_USUARIO = ['perfil', 'seguridad', 'notificaciones', 'privacidad'];

// Pestañas de la zona de configuración del barbero.
// Ver la nota de PESTANAS_CONFIG_USUARIO: hoy los controladores usan su propia lista.
const PESTANAS_CONFIG_PELUQUERO = ['portafolio', 'agenda', 'servicios', 'notificaciones'];

/** Busca un servicio por su nombre exacto. */
// Nota: en el código se usa en su lugar buscarServicioCatalogo de servicios/catalogo.js.
function buscarServicio(nombre) {
  return SERVICIOS.find((servicio) => servicio.nombre === nombre);
}

module.exports = {
  CATEGORIAS,
  DIAS,
  DURACIONES_SERVICIO,
  ESTADOS_RESERVA,
  PESTANAS_CONFIG_PELUQUERO,
  PESTANAS_CONFIG_USUARIO,
  ROLES,
  SERVICIOS,
  TIPOS_MENSAJE,
  TRANSICIONES_PEDIDO,
  TRANSICIONES_RESERVA,
  buscarServicio
};

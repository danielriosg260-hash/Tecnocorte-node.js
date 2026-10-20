// Servicios que ofrece la barbería. Se usan en las citas y en los reportes.
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

const ROLES = [
  ['Cliente', 'Cliente'],
  ['Barbero', 'Barbero'],
  ['Admin', 'Administrador']
];

const CATEGORIAS = [
  ['Herramientas', 'Herramientas'],
  ['Fijacion', 'Fijación & Textura'],
  ['Cuidado', 'Cuidado Capilar'],
  ['Barba', 'Barba & Afeitado']
];

const ESTADOS_RESERVA = [
  ['Pendiente', 'Pendiente'],
  ['Confirmada', 'Confirmada'],
  ['Completada', 'Completada'],
  ['Cancelada', 'Cancelada']
];

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
const PESTANAS_CONFIG_USUARIO = ['perfil', 'seguridad', 'notificaciones', 'privacidad'];

// Pestañas de la zona de configuración del barbero.
const PESTANAS_CONFIG_PELUQUERO = ['portafolio', 'agenda', 'servicios', 'notificaciones'];

/** Busca un servicio por su nombre exacto. */
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

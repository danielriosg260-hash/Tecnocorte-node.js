/**
 * Servicio de catálogo de TecnoCorte.
 *
 * Centraliza lo que se muestra al público:
 *  - Catálogo de servicios: une los servicios base del sistema con los que los
 *    barberos crearon y quedaron aprobados (sin duplicar nombres).
 *  - Contenido de la portada: servicios y productos destacados según la
 *    configuración del admin, con imágenes de respaldo y reseñas de clientes.
 *  - Control de reseñas: cuántas opiniones puede publicar cada cliente.
 */
const Servicio = require('../models/servicio.model');
const Producto = require('../models/producto.model');
const Calificacion = require('../models/calificacion.model');
const Configuracion = require('../models/configuracion.model');
const { SERVICIOS } = require('../config/constantes');
const { aObjeto } = require('../utils/objetos');

// Imagen que se usa en la portada cuando el servicio o el producto no tiene foto.
const IMAGENES_SERVICIO = {
  'Corte de Cabello': '/images/corte_cabello.jpeg',
  'Arreglo de Barba': '/images/arreglo_barba.jpeg',
  'Combo Completo': '/images/servicio_completo.jpeg'
};
const IMAGEN_SERVICIO_POR_DEFECTO = '/images/corte_masculino.jpg';

// Imagen de respaldo por categoría de producto (se aceptan las categorías tal cual y en minúsculas).
const IMAGENES_PRODUCTO = {
  Herramientas: '/images/maquina_motilar.jpg',
  Fijacion: '/images/pomada_barba.jpeg',
  Cuidado: '/images/cepillo.jpeg',
  Barba: '/images/aceite_barba.jpeg',
  cabello: '/images/pomada_barba.jpeg',
  barba: '/images/aceite_barba.jpeg',
  accesorios: '/images/cepillo.jpeg',
  cuidado: '/images/aceite_barba.jpeg'
};
const IMAGEN_PRODUCTO_POR_DEFECTO = '/images/pomada_barba.jpeg';

// Productos que se muestran en la portada si el admin no eligió destacados propios.
const PRODUCTOS_DESTACADOS = ['Pomada para el Cabello', 'Aceite para Barba'];

// Máximo de reseñas visibles en la portada y máximo de reseñas que puede publicar cada cliente.
const RESENAS_VISIBLES = 5;
const RESENAS_POR_PERSONA = 2;

/**
 * Junta los servicios base con los que los barberos ya tienen aprobados.
 * @returns {Promise<Array>} Lista única de servicios, sin repetir por nombre.
 */
async function catalogoServicios() {
  const propios = await Servicio.find({ activo: true }).lean();
  const lista = [...SERVICIOS];
  const nombres = new Set(SERVICIOS.map((servicio) => servicio.nombre));

  for (const servicio of propios) {
    // Si el nombre ya está en los servicios base, prevalece la versión base.
    if (nombres.has(servicio.nombre)) continue;
    nombres.add(servicio.nombre);
    lista.push({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      duracion: servicio.duracion,
      minutos: servicio.minutos,
      precio: servicio.precio
    });
  }

  return lista;
}

/**
 * Busca un servicio dentro del catálogo completo.
 * @param {string} nombre Nombre exacto del servicio.
 * @returns {Promise<object|null>} El servicio encontrado o null si no existe.
 */
async function buscarServicioCatalogo(nombre) {
  const catalogo = await catalogoServicios();
  return catalogo.find((servicio) => servicio.nombre === nombre) || null;
}

/**
 * Devuelve cuántas reseñas le quedan por publicar a un cliente.
 * @param {string} clienteId Id del cliente.
 * @returns {Promise<number>} Entre 0 y RESENAS_POR_PERSONA.
 */
async function resenasRestantes(clienteId) {
  const usadas = await Calificacion.countDocuments({ cliente: clienteId });
  return Math.max(RESENAS_POR_PERSONA - usadas, 0);
}

/**
 * Datos que se muestran en la portada: dos servicios, dos productos y las
 * reseñas publicadas. Si el admin no eligió destacados se usan los de siempre.
 * @returns {Promise<object>} inicios de servicios/productos con imagen, reseñas y límites.
 */
async function contenidoInicio() {
  const config = await Configuracion.cargar();
  const catalogo = await catalogoServicios();
  const porNombre = new Map(catalogo.map((servicio) => [servicio.nombre, servicio]));

  // Primero los destacados elegidos por el admin (validados y sin repetir)...
  const serviciosElegidos = [];
  for (const nombre of [config.servicio_destacado_1, config.servicio_destacado_2]) {
    if (nombre && porNombre.has(nombre) && !serviciosElegidos.some((item) => item.nombre === nombre)) {
      serviciosElegidos.push(porNombre.get(nombre));
    }
  }

  // ...y si faltan, se completan con los primeros del catálogo hasta llegar a dos.
  for (const servicio of catalogo) {
    if (serviciosElegidos.length >= 2) break;
    if (!serviciosElegidos.some((item) => item.nombre === servicio.nombre)) serviciosElegidos.push(servicio);
  }

  // Asigna a cada servicio elegido su foto de portada (o la genérica del sistema).
  const inicioServicios = serviciosElegidos.slice(0, 2).map((servicio) => ({
    ...servicio,
    imagen: IMAGENES_SERVICIO[servicio.nombre] || IMAGEN_SERVICIO_POR_DEFECTO
  }));

  // Mismo criterio para productos: destacados del admin que sigan disponibles.
  const productos = [];
  for (const producto of [config.producto_destacado_1, config.producto_destacado_2]) {
    if (producto && producto.disponible && !productos.some((item) => String(item.id) === String(producto._id))) {
      productos.push(aObjeto(await Producto.findById(producto)));
    }
  }

  // Completar con los productos de siempre y luego con cualquiera disponible.
  if (productos.length < 2) {
    const disponibles = await Producto.find({ disponible: true });
    const deSiempre = disponibles
      .filter((producto) => PRODUCTOS_DESTACADOS.includes(producto.nombre))
      .sort((a, b) => PRODUCTOS_DESTACADOS.indexOf(a.nombre) - PRODUCTOS_DESTACADOS.indexOf(b.nombre));

    for (const producto of [...deSiempre, ...disponibles]) {
      if (productos.length >= 2) break;
      const item = aObjeto(producto);
      if (!productos.some((elegido) => elegido.id === item.id)) productos.push(item);
    }
  }

  // imagen_respaldo es la que usa la tarjeta cuando la foto principal no carga.
  const inicioProductos = productos.slice(0, 2).map((producto) => ({
    ...producto,
    imagen_respaldo: IMAGENES_PRODUCTO[producto.categoria] || IMAGEN_PRODUCTO_POR_DEFECTO
  }));

  // Las reseñas se ocultan por completo si el admin desactivó mostrar calificaciones.
  const resenas = config.mostrar_calificaciones
    ? await Calificacion.find().populate('cliente', 'nombre apellido').populate('peluquero', 'nombre apellido').sort({ createdAt: -1 })
    : [];

  return {
    inicio_servicios: inicioServicios,
    inicio_productos: inicioProductos,
    inicio_resenas: resenas.map((resena) => aObjeto(resena)),
    resenas_visibles: RESENAS_VISIBLES,
    resenas_por_persona: RESENAS_POR_PERSONA
  };
}

module.exports = {
  RESENAS_POR_PERSONA,
  RESENAS_VISIBLES,
  buscarServicioCatalogo,
  catalogoServicios,
  contenidoInicio,
  resenasRestantes
};

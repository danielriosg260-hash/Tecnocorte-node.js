const express = require('express');

const router = express.Router();

router.get('/openapi.json', (req, res) => {
  const jsonBody = (schema) => ({ required: true, content: { 'application/json': { schema } } });
  const ok = (schema) => ({ description: 'Operación exitosa', content: { 'application/json': { schema } } });
  const error = { description: 'Error de validación o autorización', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'TecnoCorte API',
      version: '1.0.0',
      description: 'API de usuarios, sedes, productos, reservas, catálogo y configuración de TecnoCorte.',
    },
    servers: [{ url: process.env.APP_URL || `${req.protocol}://${req.get('host')}` }],
    tags: [
      { name: 'Autenticación' }, { name: 'Usuarios' }, { name: 'Catálogo' },
      { name: 'Reservas' }, { name: 'Productos' }, { name: 'Configuración' },
    ],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        Error: { type: 'object', required: ['mensaje'], properties: { mensaje: { type: 'string', example: 'Datos inválidos' } } },
        User: { type: 'object', properties: { id: { type: 'string' }, nombre: { type: 'string' }, apellido: { type: 'string' }, email: { type: 'string', format: 'email' }, rol: { type: 'string', enum: ['Cliente', 'Barbero', 'Admin'] }, activo: { type: 'boolean' } } },
        Product: { type: 'object', required: ['nombre', 'precio'], properties: { id: { type: 'string' }, nombre: { type: 'string' }, descripcion: { type: 'string' }, precio: { type: 'number', minimum: 0 }, stock: { type: 'integer', minimum: 0 }, disponible: { type: 'boolean' } } },
        Service: { type: 'object', required: ['nombre', 'minutos', 'precio'], properties: { id: { type: 'string' }, nombre: { type: 'string' }, descripcion: { type: 'string' }, duracion: { type: 'string' }, minutos: { type: 'integer', minimum: 1, maximum: 480 }, precio: { type: 'number', minimum: 0 }, activo: { type: 'boolean' } } },
        Reservation: { type: 'object', required: ['cliente', 'peluqueria', 'peluquero', 'fecha', 'hora', 'servicio'], properties: { id: { type: 'string' }, cliente: { type: 'string' }, peluqueria: { type: 'string' }, peluquero: { type: 'string' }, fecha: { type: 'string', format: 'date' }, hora: { type: 'string', example: '10:00' }, servicio: { type: 'string' }, estado: { type: 'string' } } },
        Configuracion: { type: 'object', properties: { sitio_nombre: { type: 'string' }, modo_mantenimiento: { type: 'boolean' }, registro_abierto: { type: 'boolean' }, mostrar_galeria: { type: 'boolean' } } },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/catalogo/servicios': {
        get: { tags: ['Catálogo'], summary: 'Listar servicios activos', responses: { 200: ok({ type: 'array', items: { $ref: '#/components/schemas/Service' } }), 401: error } },
        post: { tags: ['Catálogo'], summary: 'Crear servicio', requestBody: jsonBody({ $ref: '#/components/schemas/Service' }), responses: { 201: ok({ $ref: '#/components/schemas/Service' }), 400: error, 403: error } },
      },
      '/api/catalogo/solicitudes-servicio': {
        get: { tags: ['Catálogo'], summary: 'Listar solicitudes de servicios', responses: { 200: ok({ type: 'array', items: { $ref: '#/components/schemas/Service' } }), 401: error } },
        post: { tags: ['Catálogo'], summary: 'Solicitar un servicio', requestBody: jsonBody({ $ref: '#/components/schemas/Service' }), responses: { 201: ok({ type: 'object' }), 400: error, 403: error } },
      },
      '/api/catalogo/galeria/{peluqueriaId}': { get: { tags: ['Catálogo'], summary: 'Listar galería de una peluquería', parameters: [{ name: 'peluqueriaId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: ok({ type: 'array', items: { type: 'object' } }), 404: error } } },
      '/api/configuracion': { get: { tags: ['Configuración'], summary: 'Consultar configuración', responses: { 200: ok({ $ref: '#/components/schemas/Configuracion' }), 401: error } }, put: { tags: ['Configuración'], summary: 'Actualizar configuración', requestBody: jsonBody({ $ref: '#/components/schemas/Configuracion' }), responses: { 200: ok({ $ref: '#/components/schemas/Configuracion' }), 403: error } } },
      '/api/usuarios': { get: { tags: ['Usuarios'], summary: 'Listar usuarios', responses: { 200: ok({ type: 'array', items: { $ref: '#/components/schemas/User' } }), 401: error } }, post: { tags: ['Usuarios'], summary: 'Crear usuario', requestBody: jsonBody({ $ref: '#/components/schemas/User' }), responses: { 201: ok({ $ref: '#/components/schemas/User' }), 400: error } } },
      '/api/productos': { get: { tags: ['Productos'], summary: 'Listar productos', responses: { 200: ok({ type: 'array', items: { $ref: '#/components/schemas/Product' } }), 401: error } }, post: { tags: ['Productos'], summary: 'Crear producto', requestBody: jsonBody({ $ref: '#/components/schemas/Product' }), responses: { 201: ok({ $ref: '#/components/schemas/Product' }), 400: error } } },
      '/api/reservas': { get: { tags: ['Reservas'], summary: 'Listar reservas', responses: { 200: ok({ type: 'array', items: { $ref: '#/components/schemas/Reservation' } }), 401: error } }, post: { tags: ['Reservas'], summary: 'Crear reserva', requestBody: jsonBody({ $ref: '#/components/schemas/Reservation' }), responses: { 201: ok({ $ref: '#/components/schemas/Reservation' }), 400: error } } },
    },
  });
});

module.exports = router;

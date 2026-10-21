/**
 * Pruebas de humo (smoke) de TecnoCorte.
 * Comprueban que las plantillas compilan, que rutas/middleware y modelos
 * cargan sin errores y que los límites de negocio siguen en su sitio.
 * Se ejecutan con el runner nativo de Node: `node --test`.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');

// Carpeta raíz del proyecto, usada para localizar views/.
const root = path.join(__dirname, '..');

// Plantillas: recorre views/ y compila cada archivo .ejs encontrado.
test('todas las plantillas EJS compilan', () => {
  const views = [];
  // Recorrido recursivo que junta todas las rutas de archivos .ejs.
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.ejs')) views.push(file);
    }
  };
  visit(path.join(root, 'views'));
  // Compilar lanza si hay sintaxis inválida en alguna plantilla.
  for (const file of views) ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file });
  // La carpeta de vistas no puede estar vacía.
  assert.ok(views.length > 0);
});

// Módulos clave: require() sin errores significa que no hay fallos de sintaxis
// ni dependencias rotas en rutas y middleware.
test('las rutas y middleware principales cargan sin errores', () => {
  assert.doesNotThrow(() => {
    require('../routes/publico.routes');
    require('../routes/cuenta.routes');
    require('../routes/admin.routes');
    require('../routes/barbero.routes');
    require('../routes/auth.routes');
    require('../middleware/sesion');
    require('../middleware/auth');
    require('../middleware/errores');
    require('../middleware/mantenimiento');
  });
});

// Seguridad del modelo: la contraseña nunca sale por defecto y las
// cuentas nuevas nacen activas.
test('el modelo de usuario no expone la contraseña por defecto', () => {
  const Usuario = require('../models/usuario.model');
  assert.equal(Usuario.schema.path('password').options.select, false);
  assert.equal(Usuario.schema.path('activo').options.default, true);
});

// Reglas de negocio fijadas en los esquemas: horarios válidos, enums de
// estados, precios/stock sin negativos y cantidades mínimas de 1.
test('los modelos aplican límites básicos de negocio', () => {
  const Reserva = require('../models/reserva.model');
  const Producto = require('../models/producto.model');
  const Pedido = require('../models/pedido.model');
  const PedidoProducto = require('../models/pedidoproducto.model');

  // Reserva: la hora debe encajar en el patrón de hora y usar esos estados.
  assert.ok(Reserva.schema.path('hora').options.match.test('23:59'));
  assert.deepEqual(Reserva.schema.path('estado').options.enum, ['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'Reprogramar', 'NoAsistio']);
  // Producto: precio y stock no pueden ser negativos.
  assert.equal(Producto.schema.path('precio').options.min, 0);
  assert.equal(Producto.schema.path('stock').options.min, 0);
  // Pedido: enum de estados propio del flujo de entregas.
  assert.deepEqual(Pedido.schema.path('estado').options.enum, ['Pendiente', 'Listo', 'Entregado', 'Cancelado']);
  // Línea de pedido: siempre al menos una unidad.
  assert.equal(PedidoProducto.schema.path('cantidad').options.min, 1);
});

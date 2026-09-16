const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');

const root = path.join(__dirname, '..');

test('todas las plantillas EJS compilan', () => {
  const views = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.ejs')) views.push(file);
    }
  };
  visit(path.join(root, 'views'));
  for (const file of views) ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file });
  assert.ok(views.length > 0);
});

test('las rutas y middleware principales cargan sin errores', () => {
  assert.doesNotThrow(() => {
    require('../routes/Page.routes');
    require('../routes/Auth.routes');
    require('../middleware/auth');
    require('../middleware/webAuth');
  });
});

test('el modelo de usuario no expone la contraseña por defecto', () => {
  const Usuario = require('../models/Usuario.model');
  assert.equal(Usuario.schema.path('password').options.select, false);
  assert.equal(Usuario.schema.path('activo').options.default, true);
});

test('los modelos aplican límites básicos de negocio', () => {
  const Reserva = require('../models/Reserva.model');
  const Producto = require('../models/Producto.model');
  const Pedido = require('../models/Pedido.model');
  const PedidoProducto = require('../models/PedidoProducto.model');

  assert.ok(Reserva.schema.path('hora').options.match.test('23:59'));
  assert.deepEqual(Reserva.schema.path('estado').options.enum, ['Pendiente', 'Confirmada', 'Completada', 'Cancelada', 'Reprogramar']);
  assert.equal(Producto.schema.path('precio').options.min, 0);
  assert.equal(Producto.schema.path('stock').options.min, 0);
  assert.deepEqual(Pedido.schema.path('estado').options.enum, ['Pendiente', 'Confirmado', 'Enviado', 'Entregado', 'Cancelado']);
  assert.equal(PedidoProducto.schema.path('cantidad').options.min, 1);
});

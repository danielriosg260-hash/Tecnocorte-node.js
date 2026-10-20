const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const test = require('node:test');

test('la documentación OpenAPI responde como JSON sin autenticación', async () => {
  const app = express();
  app.use('/api', require('../routes/openapi.routes'));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/openapi.json`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.openapi, '3.0.3');
    assert.ok(body.paths['/api/catalogo/servicios']);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

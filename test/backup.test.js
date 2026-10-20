const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');

test('existe la plantilla de variables de entorno para despliegue', () => {
  const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const variable of [
    'DATABASE_URL=',
    'MONGO_DB_NAME=',
    'EMAIL_USER=',
    'EMAIL_PASS=',
    'BACKUP_EMAIL=',
    'BACKUP_TIMEZONE=',
  ]) {
    assert.match(envExample, new RegExp(`^${variable}`, 'm'));
  }
  assert.doesNotMatch(envExample, /FcVUELt8bQwq5Nbg|rtwr\s+nuwa/i);
});

test('el servicio de backup exporta la función requerida', () => {
  const backup = require('../servicios/backup');
  assert.equal(typeof backup.backupDatabase, 'function');
});

test('el servicio de recordatorios exporta la función programada', () => {
  const recordatorios = require('../services/recordatorios');
  assert.equal(typeof recordatorios.enviarRecordatorios, 'function');
});

test('el script Bash de cron registra la fecha y hora', () => {
  const script = fs.readFileSync(path.join(root, 'scripts', 'registrar-ejecucion.sh'), 'utf8');
  assert.match(script, /date/);
  assert.match(script, /backup-cron\.log/);
  assert.match(script, />>/);
});

// Ejecuta el respaldo manualmente con: npm run backup
const { backupDatabase } = require('../servicios/backup');

backupDatabase().then((ok) => {
  if (!ok) process.exitCode = 1;
});

// Respaldo manual de la base de datos.
// Se ejecuta con: npm run backup
//
// Hace lo mismo que el respaldo nocturno (mongodump + limpieza de carpetas
// viejas) pero sin enviar el archivo por correo. El respaldo queda en la
// carpeta backup/ del proyecto.

const { backupDatabase, limpiarBackupsAntiguos } = require('../servicios/backup');

backupDatabase().then((destino) => {
  limpiarBackupsAntiguos();
  // Código de salida 1 para que los scripts o el crontab se enteren del fallo.
  if (!destino) process.exitCode = 1;
});

/**
 * Configuración de PM2 para desplegar la API de TecnoCorte.
 * Se ejecuta con: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      // Nombre con el que aparece el proceso en las listas de PM2.
      name: "tecnocorte-api",
      script: "./index.js",
      // Una sola instancia en modo fork (la app no usa clúster ni workers).
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};

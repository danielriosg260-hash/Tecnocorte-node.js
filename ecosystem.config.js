module.exports = {
  apps: [
    {
      name: "tecnocorte-api",
      script: "./index.js",
      instances: 1,           // Solo 1 instancia para evitar choques de puertos
      exec_mode: "fork",      // Modo fork estándar (desactiva el cluster)
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
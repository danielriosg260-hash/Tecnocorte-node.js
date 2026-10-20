# TecnoCorte

Aplicación web para la gestión de barberías: reservas de citas, tienda de productos, carrito, pedidos, usuarios con roles y paneles de administración y barbero.

Está construida con **Node.js, Express, MongoDB, Mongoose y EJS**.

## Requisitos

- Node.js 18 o superior
- MongoDB local o una base de datos en MongoDB Atlas
- MongoDB Database Tools (`mongodump` y `mongorestore`)

## Instalación

1. Clonar el repositorio e instalar las dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` a partir de `.env.example` y completar los datos:

   ```bash
   cp .env.example .env
   ```

3. Iniciar el servidor:

   ```bash
   npm start
   ```

4. Abrir en el navegador:

   ```text
   http://localhost:3000
   ```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `MONGO_URI` | Cadena de conexión de MongoDB (local o Atlas) |
| `MONGO_DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Clave secreta para firmar el token de sesión |
| `JWT_EXPIRE` | Duración del token, por ejemplo `7d` |
| `PORT` | Puerto del servidor (en Render lo asigna la plataforma) |
| `NODE_ENV` | `development` o `production` |
| `APP_URL` | URL pública de la aplicación |
| `EMAIL_USER` | Correo de Gmail que envía las notificaciones |
| `EMAIL_PASS` | Contraseña de aplicación de Gmail |

> `EMAIL_PASS` no es la contraseña normal del correo. Debe ser una contraseña de aplicación creada desde la cuenta de Google.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Inicia el servidor |
| `npm run dev` | Inicia el servidor con nodemon |
| `npm test` | Ejecuta las pruebas |
| `npm run backup` | Genera un respaldo manual de la base de datos |

## Backup

El servicio está en `services/backup.js` y usa `node-cron` y `mongodump`.

> En la bitácora el archivo aparece como `servicios/backup.js`. En este proyecto quedó en `services/backup.js` para mantener el mismo nombre de carpeta que `controllers`, `models`, `routes`, etc.

- Se ejecuta todos los días a las **00:00**.
- Cada respaldo se guarda en su propia carpeta:

  ```text
  backup/2026-10-20_00-00-00/
  ```

- Para probarlo sin esperar la hora programada:

  ```bash
  npm run backup
  ```

### Instalar MongoDB Database Tools

El comando `mongodump` no viene incluido con Node.js ni con MongoDB Compass. Hay que instalar las herramientas:

- Descarga: <https://www.mongodb.com/try/download/database-tools>
- En Windows, agregar la carpeta `bin` al `PATH`.
- Verificar la instalación:

  ```bash
  mongodump --version
  ```

En Linux (Ubuntu o Debian), si está configurado el repositorio de MongoDB:

```bash
sudo apt-get install mongodb-database-tools
```

### Script de Bash y crontab

El archivo `scripts/registrar-ejecucion.sh` guarda la fecha y la hora en `logs/backup-cron.log` cada vez que se ejecuta.

Pasos para programarlo:

1. Dar permisos de ejecución:

   ```bash
   chmod +x scripts/registrar-ejecucion.sh
   ```

2. Abrir el editor de tareas del sistema:

   ```bash
   crontab -e
   ```

3. Agregar una línea con la **ruta absoluta** del proyecto. Para ejecutarlo todos los días a las 00:00:

   ```text
   0 0 * * * /home/usuario/tecnocorte/scripts/registrar-ejecucion.sh
   ```

   Para probar que el cron funciona, se puede ejecutar cada minuto:

   ```text
   * * * * * /home/usuario/tecnocorte/scripts/registrar-ejecucion.sh
   ```

4. Guardar el archivo y revisar el resultado:

   ```bash
   tail -f logs/backup-cron.log
   ```

El script debe quedar dentro de la carpeta `scripts/` del proyecto y se recomienda usar la ruta completa en el crontab. Si se quiere que el crontab ejecute el respaldo real en lugar del script de prueba:

```text
0 0 * * * cd /home/usuario/tecnocorte && /usr/bin/npm run backup >> logs/backup-cron.log 2>&1
```

### Política de respaldo

- **Frecuencia:** todos los días a las 00:00.
- **Conservación:** 7 días. Las carpetas más antiguas se pueden borrar con:

  ```bash
  find backup -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
  ```

- **Ubicación:** carpeta `backup/` del servidor. En producción se debe copiar también a un almacenamiento externo (otro disco, nube o correo).
- **Verificación:** revisar el log y probar una restauración con `mongorestore` en una base de datos de prueba.
- **Responsable:** el administrador del sistema.

> En Render, `mongodump` no viene instalado por defecto y el disco de la aplicación es temporal. Para backups en producción se debe usar un servidor con las herramientas instaladas o los backups automáticos de MongoDB Atlas.

## Despliegue

### Render

1. Conectar el repositorio de GitHub.
2. Configurar las variables de entorno en el panel de Render.
3. Usar estos comandos:

   ```text
   Build: npm install
   Start: npm start
   ```

4. No definir `PORT` manualmente: Render entrega esa variable.
5. Activar el despliegue automático desde la rama `main`.

### PM2 (servidor local o VPS)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 status
pm2 logs tecnocorte-api
pm2 save
pm2 startup
```

### SSH y SCP

Conectarse al servidor:

```bash
ssh usuario@192.168.1.100
```

Enviar la carpeta del proyecto:

```bash
scp -r Tecnocorte-node usuario@192.168.1.100:/home/usuario/
```

Después de copiarla, entrar por SSH, crear el `.env`, ejecutar `npm install` y levantar la aplicación con PM2.

## Crear el primer administrador

El formulario de registro crea usuarios con rol **Cliente**. Para tener un administrador:

1. Registrarse desde `/registro`.
2. Abrir la base de datos con MongoDB Compass.
3. En la colección `usuarios`, buscar el usuario y cambiar el campo `rol` a `Admin`.
4. Cerrar sesión y volver a entrar.

## Estructura del proyecto

```text
config/       Conexión a la base de datos y configuración de sesión
controllers/  Controladores de páginas y de la API
middleware/   Sesión, permisos, CSRF, límites y manejo de errores
models/       Modelos de Mongoose
public/       CSS e imágenes
routes/       Rutas públicas, de usuario, de barbero y de administrador
scripts/      Scripts de backup y de crontab
services/     Correo, backup, logs, catálogo y disponibilidad
test/         Pruebas del proyecto
utils/        Funciones auxiliares
views/        Plantillas EJS
```

## Pruebas

```bash
npm test
```

const Configuracion = require('../models/configuracion.model');
const { registrarAccion } = require('../services/auditoria');

async function obtener(req, res) {
  return res.json(await Configuracion.cargar());
}

async function actualizar(req, res) {
  const permitidos = [
    'sitio_nombre', 'correo_contacto', 'texto_aviso', 'registro_abierto',
    'mostrar_telefonos', 'mostrar_ubicaciones', 'mostrar_galeria',
    'mostrar_calificaciones', 'modo_mantenimiento', 'mensaje_mantenimiento',
    'servicio_destacado_1', 'servicio_destacado_2', 'producto_destacado_1',
    'producto_destacado_2',
  ];
  const cambios = Object.fromEntries(Object.entries(req.body).filter(([clave]) => permitidos.includes(clave)));
  const config = await Configuracion.findOneAndUpdate({}, cambios, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  await registrarAccion(req, 'actualizar_configuracion', 'Configuracion', config._id, cambios);
  return res.json(config);
}

module.exports = { obtener, actualizar };

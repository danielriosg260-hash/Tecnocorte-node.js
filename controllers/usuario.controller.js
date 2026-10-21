/**
 * API de usuarios: alta, consulta, edición y borrado de cuentas.
 * Todas las rutas de este controlador están reservadas al rol Admin.
 */
const Usuario = require('../models/usuario.model');
const Reserva = require('../models/reserva.model');
const Pedido = require('../models/pedido.model');
const { inicioDelDia } = require('../servicios/disponibilidad');
const { notificarReserva, notificarSuspension } = require('../servicios/notificaciones');
const { aObjeto } = require('../utils/objetos');

/** Lista todos los usuarios (sin la contraseña). */
async function find(req, res) {
  try {
    const usuarios = await Usuario.find().sort({ createdAt: -1 });
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudieron cargar los usuarios.' });
  }
}

/** Busca un usuario por su id. */
async function findOne(req, res) {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo cargar el usuario.' });
  }
}

/** Crea un usuario. */
async function insertOne(req, res) {
  try {
    const usuario = await Usuario.create({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      email: req.body.email,
      password: req.body.password,
      telefono: req.body.telefono,
      rol: req.body.rol,
      peluqueria_id: req.body.peluqueria_id
    });

    res.status(201).json(aObjeto(usuario));
  } catch (error) {
    // 11000 es la clave duplicada de MongoDB: ya existe otra cuenta con ese correo.
    const mensaje = error.code === 11000 ? 'El correo ya está registrado.' : 'No se pudo crear el usuario.';
    res.status(400).json({ mensaje });
  }
}

/** Actualiza un usuario. */
async function findOneAndUpdate(req, res) {
  try {
    // La contraseña viene excluida del modelo, por eso se pide con "+password";
    // tokenVersion sirve para invalidar los JWT abiertos al cambiar datos.
    const usuario = await Usuario.findById(req.params.id).select('+password +tokenVersion');
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    if (usuario.rol === 'Admin' && req.body.activo === false) {
      return res.status(403).json({ mensaje: 'Las cuentas de administrador no se suspenden.' });
    }
    if (usuario.rol === 'Admin' && req.body.rol && req.body.rol !== 'Admin') {
      const administradoresActivos = await Usuario.countDocuments({ rol: 'Admin', activo: { $ne: false } });
      if (administradoresActivos <= 1) return res.status(409).json({ mensaje: 'Debe quedar al menos un administrador activo.' });
    }

    // Copia solo los campos enviados en el cuerpo, uno por uno.
    ['nombre', 'apellido', 'email', 'telefono', 'rol', 'activo', 'peluqueria_id'].forEach((campo) => {
      if (req.body[campo] !== undefined) usuario[campo] = req.body[campo];
    });

    // La contraseña solo se toca si viene en la petición (la hashea el modelo).
    if (req.body.password !== undefined) usuario.password = req.body.password;

    await usuario.save();

    if (req.body.activo === false) {
      const filtro = {
        [usuario.rol === 'Barbero' ? 'peluquero' : 'cliente']: usuario._id,
        fecha: { $gte: inicioDelDia() },
        estado: { $in: ['Pendiente', 'Confirmada', 'Reprogramar'] }
      };
      const futuras = await Reserva.find(filtro).select('_id');
      if (usuario.rol === 'Barbero') {
        await Reserva.updateMany(
          { _id: { $in: futuras.map((item) => item._id) } },
          { estado: 'Reprogramar', requiere_reprogramacion: true, motivo_reprogramacion: 'El barbero fue suspendido. Selecciona otro barbero.' }
        );
        await Promise.all(futuras.map((reserva) => notificarSuspension(reserva._id)));
      } else if (usuario.rol === 'Cliente') {
        await Reserva.updateMany(
          { _id: { $in: futuras.map((item) => item._id) } },
          { estado: 'Cancelada', requiere_reprogramacion: false, motivo_reprogramacion: '', motivo_cancelacion: 'La cuenta del cliente fue suspendida.' }
        );
        await Promise.all(futuras.map((reserva) => notificarReserva(reserva._id, 'cancelada')));
      }
    }

    res.status(200).json(aObjeto(usuario));
  } catch (error) {
    const mensaje = error.code === 11000 ? 'El correo ya está registrado.' : 'No se pudo actualizar el usuario.';
    res.status(400).json({ mensaje });
  }
}

/** Elimina un usuario. */
async function findOneAndDelete(req, res) {
  try {
    // Un usuario nunca se puede dar de baja a sí mismo desde la API.
    if (String(req.params.id) === String(req.usuario._id)) {
      return res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario.' });
    }

    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    const tieneHistorial = await Promise.all([
      Reserva.exists({ $or: [{ cliente: usuario._id }, { peluquero: usuario._id }] }),
      Pedido.exists({ cliente: usuario._id })
    ]);
    if (tieneHistorial.some(Boolean)) {
      return res.status(409).json({ mensaje: 'No se puede eliminar un usuario con reservas o pedidos. Suspéndelo en su lugar.' });
    }

    await usuario.deleteOne();

    res.status(200).json({ mensaje: 'Usuario eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ mensaje: 'No se pudo eliminar el usuario.' });
  }
}

module.exports = { find, findOne, findOneAndUpdate, findOneAndDelete, insertOne };

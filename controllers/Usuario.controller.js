const Usuario = require('../models/Usuario.model');
const Reserva = require('../models/Reserva.model');
const Pedido = require('../models/Pedido.model');

const camposPublicos = (usuario) => ({
  id: usuario._id,
  nombre: usuario.nombre,
  apellido: usuario.apellido,
  email: usuario.email,
  telefono: usuario.telefono,
  rol: usuario.rol,
  activo: usuario.activo,
  peluqueria_id: usuario.peluqueria_id
});

const crear = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono, rol, peluqueria_id } = req.body;
    if (!nombre || !apellido || !email || typeof password !== 'string' || password.length < 8) return res.status(400).json({ mensaje: 'Datos de usuario inválidos' });
    const usuario = await Usuario.create({ nombre, apellido, email, password, telefono, rol, peluqueria_id });
    return res.status(201).json(camposPublicos(usuario));
  } catch (error) {
    return res.status(400).json({ mensaje: error.code === 11000 ? 'El correo ya está registrado' : 'No se pudo crear el usuario' });
  }
};

const listarTodos = async (req, res) => {
  const usuarios = await Usuario.find().select('-password').sort({ createdAt: -1 });
  res.status(200).json(usuarios);
};

const listarUno = async (req, res) => {
  const usuario = await Usuario.findById(req.params.id).select('-password');
  if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
  res.status(200).json(usuario);
};

const actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select('+password +tokenVersion');
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    const campos = ['nombre', 'apellido', 'email', 'telefono', 'rol', 'activo', 'peluqueria_id'];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) usuario[campo] = req.body[campo];
    });
    if (req.body.password !== undefined) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 8) return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres' });
      usuario.password = req.body.password;
    }
    await usuario.save();
    return res.status(200).json(camposPublicos(usuario));
  } catch (error) {
    return res.status(400).json({ mensaje: error.code === 11000 ? 'El correo ya está registrado' : 'No se pudo actualizar el usuario' });
  }
};

const eliminar = async (req, res) => {
  if (String(req.params.id) === String(req.usuario._id)) return res.status(400).json({ mensaje: 'No puedes eliminar tu propio usuario' });
  const [reservas, pedidos] = await Promise.all([
    Reserva.countDocuments({ $or: [{ cliente: req.params.id }, { peluquero: req.params.id }] }),
    Pedido.countDocuments({ cliente: req.params.id })
  ]);
  if (reservas || pedidos) return res.status(409).json({ mensaje: 'No se puede eliminar un usuario con reservas o pedidos relacionados' });
  const usuario = await Usuario.findByIdAndDelete(req.params.id);
  if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
  res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
};

module.exports = { crear, listarTodos, listarUno, actualizar, eliminar };

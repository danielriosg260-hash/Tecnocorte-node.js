const Usuario = require("../models/usuario.model");
const Reserva = require("../models/reserva.model");
const Pedido = require("../models/pedido.model");

function camposPublicos(usuario) {
  return {
    id: usuario._id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
    activo: usuario.activo,
    peluqueria_id: usuario.peluqueria_id,
  };
}

async function crear(req, res) {
  const nombre = req.body.nombre;
  const apellido = req.body.apellido;
  const email = req.body.email;
  const password = req.body.password;
  const telefono = req.body.telefono;
  const rol = req.body.rol;
  const peluqueria_id = req.body.peluqueria_id;

  try {
    if (!nombre || !apellido || !email) {
      return res.status(400).json({ mensaje: "Datos de usuario inválidos" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
    }

    const usuario = await Usuario.create({
      nombre: nombre,
      apellido: apellido,
      email: email,
      password: password,
      telefono: telefono,
      rol: rol,
      peluqueria_id: peluqueria_id,
    });
    return res.status(201).json(camposPublicos(usuario));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ mensaje: "El correo ya está registrado" });
    }
    return res.status(400).json({ mensaje: "No se pudo crear el usuario" });
  }
}

async function listarTodos(req, res) {
  try {
    const usuarios = await Usuario.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(usuarios);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudieron cargar los usuarios" });
  }
}

async function listarUno(req, res) {
  try {
    const usuario = await Usuario.findById(req.params.id).select("-password");
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo cargar el usuario" });
  }
}

async function actualizar(req, res) {
  try {
    const usuario = await Usuario.findById(req.params.id).select("+password +tokenVersion");
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const campos = ["nombre", "apellido", "email", "telefono", "rol", "activo", "peluqueria_id"];
    campos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        usuario[campo] = req.body[campo];
      }
    });

    if (req.body.password !== undefined) {
      if (typeof req.body.password !== "string" || req.body.password.length < 8) {
        return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
      }
      usuario.password = req.body.password;
    }

    await usuario.save();
    return res.status(200).json(camposPublicos(usuario));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ mensaje: "El correo ya está registrado" });
    }
    return res.status(400).json({ mensaje: "No se pudo actualizar el usuario" });
  }
}

async function eliminar(req, res) {
  try {
    if (String(req.params.id) === String(req.usuario._id)) {
      return res.status(400).json({ mensaje: "No puedes eliminar tu propio usuario" });
    }

    const reservas = await Reserva.countDocuments({
      $or: [{ cliente: req.params.id }, { peluquero: req.params.id }],
    });
    const pedidos = await Pedido.countDocuments({ cliente: req.params.id });
    if (reservas > 0 || pedidos > 0) {
      return res
        .status(409)
        .json({ mensaje: "No se puede eliminar un usuario con reservas o pedidos relacionados" });
    }

    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }
    res.status(200).json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "No se pudo eliminar el usuario" });
  }
}

module.exports = {
  crear,
  listarTodos,
  listarUno,
  actualizar,
  eliminar,
};

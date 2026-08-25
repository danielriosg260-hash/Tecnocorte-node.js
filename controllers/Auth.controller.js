const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');
const transporter = require('../config/email');

const generarToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const registro = async (req, res) => {
  try {
    const { nombre, apellido, email, password, telefono } = req.body;

    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    const usuario = await Usuario.create({ nombre, apellido, email, password, telefono });
    const token = generarToken(usuario._id);

    // Envío de correo de bienvenida
    try {
      await transporter.sendMail({
        from: `"TecnoCorte" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '¡Bienvenido a TecnoCorte!',
        html: `
          <h1>¡Hola ${nombre}!</h1>
          <p>Tu cuenta ha sido creada exitosamente.</p>
          <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p>Gracias por registrarte en TecnoCorte.</p>
        `
      });
    } catch (emailError) {
      console.error('Error al enviar correo de bienvenida:', emailError.message);
    }

    res.status(201).json({
      mensaje: 'Usuario registrado correctamente',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Ingresa correo y contraseña' });
    }

    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    const valida = await usuario.compararPassword(password);
    if (!valida) {
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
    }

    const token = generarToken(usuario._id);

    // Envío de correo de notificación de inicio de sesión
    try {
      await transporter.sendMail({
        from: `"TecnoCorte" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Inicio de sesión en tu cuenta',
        html: `
          <h1>Hola ${usuario.nombre}</h1>
          <p>Se ha detectado un inicio de sesión en tu cuenta de TecnoCorte.</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
          <p>Si no fuiste tú, cambia tu contraseña inmediatamente.</p>
        `
      });
    } catch (emailError) {
      console.error('Error al enviar correo de login:', emailError.message);
    }

    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

const perfil = async (req, res) => {
  res.status(200).json({ usuario: req.usuario });
};

module.exports = { registro, login, perfil };

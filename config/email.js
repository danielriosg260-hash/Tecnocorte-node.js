const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    // Google muestra las contraseñas de aplicación separadas por espacios.
    pass: process.env.EMAIL_PASS?.replace(/\s/g, '')
  }
});

module.exports = transporter;

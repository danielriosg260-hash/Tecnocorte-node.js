require('dotenv').config();
const bcrypt = require('bcrypt');
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');
const Peluqueria = require('../models/Peluqueria.model');
const Usuario = require('../models/Usuario.model');
const Horario = require('../models/Horario.model');
const Producto = require('../models/Producto.model');

const businesses = [
  { nombre: 'TecnoCorte Centro', ubicacion: 'Cra 15 #22-40, Centro', telefono: '601 235 8899' },
  { nombre: 'TecnoCorte Norte', ubicacion: 'Cll 106 #15-22, Norte', telefono: '601 620 4455' }
];

const hours = [
  [1, '09:00', '18:00'],
  [2, '09:00', '18:00'],
  [3, '09:00', '18:00'],
  [4, '09:00', '18:00'],
  [5, '09:00', '19:00'],
  [6, '08:00', '17:00']
];

const products = [
  ['Pomada matizante 100ml', 'Fijación media con acabado natural.', 35000, 'cabello', 24, '/images/pomada_barba.jpeg'],
  ['Aceite para barba 50ml', 'Suaviza y acondiciona la barba.', 42000, 'barba', 18, '/images/aceite_barba.jpeg'],
  ['Tijera profesional 6.5 pulgadas', 'Acero inoxidable y corte preciso.', 189000, 'accesorios', 6, '/images/Tijeras.jpeg'],
  ['Máquina de motilar profesional', 'Máquina inalámbrica con accesorios.', 159000, 'accesorios', 9, '/images/maquina_motilar.jpg'],
  ['Cepillo profesional', 'Cepillo para volumen y acabado.', 33000, 'cabello', 14, '/images/cepillo.jpeg'],
  ['Arreglo de barba clásico', 'Perfilado y toalla caliente.', 22000, 'barba', 30, '/images/arreglo_barba.jpeg']
];

(async () => {
  await connectDB();

  let peluquerias = await Peluqueria.find().sort({ createdAt: 1 });
  if (!peluquerias.length) peluquerias = await Peluqueria.insertMany(businesses);

  const password = await bcrypt.hash('Barbero123', 10);
  let barberos = await Usuario.find({ rol: 'Barbero' }).sort({ createdAt: 1 });
  if (!barberos.length) {
    barberos = await Usuario.insertMany([
      { nombre: 'Carlos', apellido: 'Mendoza', email: 'carlos@tecnocorte.test', password, rol: 'Barbero', activo: true },
      { nombre: 'Andrés', apellido: 'Torres', email: 'andres@tecnocorte.test', password, rol: 'Barbero', activo: true }
    ]);
  }

  for (let i = 0; i < barberos.length; i += 1) {
    if (!barberos[i].peluqueria_id) {
      barberos[i].peluqueria_id = peluquerias[i % peluquerias.length]._id;
      await barberos[i].save();
    }
  }

  for (const peluqueria of peluquerias) {
    for (const [dia_semana, hora_inicio, hora_fin] of hours) {
      await Horario.updateOne(
        { peluqueria: peluqueria._id, dia_semana },
        { $set: { peluqueria: peluqueria._id, dia_semana, activo: true, hora_inicio, hora_fin } },
        { upsert: true }
      );
    }
  }

  for (const [nombre, descripcion, precio, categoria, stock, imagen] of products) {
    await Producto.updateOne(
      { nombre },
      { $set: { nombre, descripcion, precio, categoria, stock, disponible: true, imagen } },
      { upsert: true }
    );
  }

  console.log(`Datos listos: ${peluquerias.length} peluquerias, ${barberos.length} barberos, ${await Horario.countDocuments()} horarios y ${await Producto.countDocuments()} productos.`);
  await mongoose.disconnect();
})().catch((error) => {
  console.error('No se pudieron crear los datos iniciales:', error.message);
  process.exitCode = 1;
});

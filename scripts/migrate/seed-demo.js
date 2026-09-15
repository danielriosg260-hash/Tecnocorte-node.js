require('dotenv').config();
const crypto = require('crypto');
const { connectDB, mongoose } = require('./config/db');
const Usuario = require('./models/Usuario.model');
const Peluqueria = require('./models/Peluqueria.model');
const Producto = require('./models/Producto.model');
const Horario = require('./models/Horario.model');

const PELUQUERIAS = [
  { nombre: 'TecnoCorte Centro', ubicacion: 'Cra 15 #22-40, Centro', telefono: '601 235 8899' },
  { nombre: 'TecnoCorte Norte', ubicacion: 'Cll 106 #15-22, Chicó Norte', telefono: '601 620 4455' }
];

const BARBEROS = [
  { nombre: 'Carlos', apellido: 'Mendoza', email: 'carlos@tecnocorte.test', telefono: '301 123 4567' },
  { nombre: 'Andrés', apellido: 'Torres', email: 'andres@tecnocorte.test', telefono: '301 234 5678' },
  { nombre: 'Diego', apellido: 'Ramírez', email: 'diego@tecnocorte.test', telefono: '301 345 6789' },
  { nombre: 'Julián', apellido: 'Vargas', email: 'julian@tecnocorte.test', telefono: '301 456 7890' }
];
const BARBERO_PASS = 'Barbero123';

const PRODUCTOS = [
  { nombre: 'Pomada matizante 100ml', descripcion: 'Fijación media con acabado natural y aroma cítrico.', precio: 35000, categoria: 'cuidado', stock: 24 },
  { nombre: 'Aceite para barba 50ml', descripcion: 'Suaviza y acondiciona la barba, reduce la picazón.', precio: 42000, categoria: 'barba', stock: 18 },
  { nombre: 'Tijera profesional 6.5"', descripcion: 'Acero inoxidable japonés, corte preciso.', precio: 189000, categoria: 'accesorios', stock: 6 },
  { nombre: 'Cera moldeadora 80g', descripcion: 'Máxima fijación sin brillo, textura seca.', precio: 29000, categoria: 'cabello', stock: 30 },
  { nombre: 'Champú anticaspa 250ml', descripcion: 'Limpieza profunda, controla la caspa por 48h.', precio: 26000, categoria: 'cuidado', stock: 40 },
  { nombre: 'Shampoo para barba 100ml', descripcion: 'Limpia sin resecar el vello facial.', precio: 24000, categoria: 'barba', stock: 22 },
  { nombre: 'Peine profesional', descripcion: 'Peine de materiales antiestáticos con acabado pulido.', precio: 12000, categoria: 'accesorios', stock: 15 },
  { nombre: 'Gel fijador fuerza 5', descripcion: 'Control total para estilos estructurados.', precio: 27500, categoria: 'cabello', stock: 28 }
];

const HORARIOS_DEFAULT = [
  { dia_semana: 1, inicio: '09:00', fin: '18:00' },
  { dia_semana: 2, inicio: '09:00', fin: '18:00' },
  { dia_semana: 3, inicio: '09:00', fin: '18:00' },
  { dia_semana: 4, inicio: '09:00', fin: '18:00' },
  { dia_semana: 5, inicio: '09:00', fin: '19:00' },
  { dia_semana: 6, inicio: '08:00', fin: '17:00' }
];

(async () => {
  await connectDB();
  const hash = await bcrypt.hash(BARBERO_PASS, 10)
    .catch((e) => { throw new Error(`bcrypt falló: ${e.message}`); });

  const peluquerias = (await Peluqueria.insertMany(PELUQUERIAS)).map(plainSafe);

  for (let i = 0; i < BARBEROS.length; i++) {
    await Usuario.findOneAndUpdate(
      { email: BARBEROS[i].email },
      { $set: { ...BARBEROS[i], password: hash, rol: 'Barbero', activo: true } },
      { upsert: true }
    );
  }

  for (const producto of PRODUCTOS) {
    await Producto.findOneAndUpdate(
      { nombre: producto.nombre },
      { $set: { ...producto, disponible: true } },
      { upsert: true }
    );
  }

  for (const peluqueria of peluquerias) {
    for (const horario of HORARIOS_DEFAULT) {
      await Horario.findOneAndUpdate(
        { peluqueria: peluqueria._id, dia_semana: horario.dia_semana },
        { $set: { activo: true, hora_inicio: horario.inicio, hora_fin: horario.fin } },
        { upsert: true }
      );
    }
  }

  const barberos = await Usuario.find({ rol: 'Barbero' }).select('email');
  console.log(`Seed OK → ${peluquerias.length} peluquerías, ${barberos.length} barberos, ${await Producto.countDocuments()} productos en tienda, ${await Horario.countDocuments()} horarios salvados.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => { console.error('Seed error:', e.message); process.exit(1); });

function plainSafe(doc) { return { _id: doc._id }; }

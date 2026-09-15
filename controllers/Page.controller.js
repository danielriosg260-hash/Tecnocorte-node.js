const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const transporter = require('../config/email');
const Usuario = require('../models/Usuario.model');
const Producto = require('../models/Producto.model');
const Peluqueria = require('../models/Peluqueria.model');
const Reserva = require('../models/Reserva.model');
const Pedido = require('../models/Pedido.model');
const PedidoProducto = require('../models/PedidoProducto.model');
const Calificacion = require('../models/Calificacion.model');
const Horario = require('../models/Horario.model');
const Bloqueo = require('../models/Bloqueo.model');
const Mensaje = require('../models/Mensaje.model');
const Ingreso = require('../models/Ingreso.model');
const { clearSessionCookie, readCart, setSessionCookie, writeCart } = require('../config/session');
const { datosPublicos, generarToken, normalizarEmail } = require('./Auth.controller');

const SERVICIOS = [
  { nombre: 'Corte de Cabello', precio: 30000, duracion: '45 min', minutos: 45, descripcion: 'Corte personalizado y acabado profesional.' },
  { nombre: 'Arreglo de Barba', precio: 22000, duracion: '30 min', minutos: 30, descripcion: 'Perfilado, toalla caliente y cuidado de la barba.' },
  { nombre: 'Combo Completo', precio: 48000, duracion: '75 min', minutos: 75, descripcion: 'Corte de cabello y arreglo de barba.' }
];
const ROLES = [['Cliente', 'Cliente'], ['Barbero', 'Barbero'], ['Admin', 'Administrador']];
const CATEGORIAS = [['cabello', 'Cabello'], ['barba', 'Barba'], ['accesorios', 'Accesorios'], ['cuidado', 'Cuidado personal']];
const ESTADOS_RESERVA = [['Pendiente', 'Pendiente'], ['Confirmada', 'Confirmada'], ['Completada', 'Completada'], ['Cancelada', 'Cancelada']];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const esId = (value) => mongoose.isValidObjectId(value);
const nextUrl = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
const dashboardUrl = (usuario) => usuario?.rol === 'Admin' ? '/admin' : usuario?.rol === 'Barbero' ? '/barbero' : '/perfil';
const plain = (doc) => {
  if (!doc) return null;
  const value = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : { ...doc };
  value.id = String(value._id || value.id);
  if (value.peluqueria_id) value.peluqueria_id = String(value.peluqueria_id);
  return value;
};
const usuarioView = (doc) => plain(doc);
const errorMessage = (error, fallback) => error?.code === 11000 ? 'El correo ya está registrado.' : fallback;

const renderLogin = (req, res, error = '') => res.render('publicos/login', {
  layout: false,
  error,
  proximo: nextUrl(req.body?.next || req.query.next || '')
});

const login = async (req, res) => {
  try {
    const email = normalizarEmail(req.body.user || req.body.email);
    const password = req.body.password;
    if (!email || typeof password !== 'string' || !password) return renderLogin(req, res, 'Ingresa correo y contraseña.');
    const usuario = await Usuario.findOne({ email }).select('+password');
    if (!usuario || usuario.activo === false || !(await usuario.compararPassword(password))) {
      return renderLogin(req, res, 'Correo o contraseña incorrectos.');
    }
    setSessionCookie(res, generarToken(usuario._id));
    void Ingreso.create({ usuario: usuario._id, rol: usuario.rol, ip: req.ip });
    const requested = req.body.next || req.query.next;
    return res.redirect(requested ? nextUrl(requested) : dashboardUrl(usuario));
  } catch {
    return renderLogin(req, res, 'No se pudo iniciar sesión.');
  }
};

const registro = async (req, res) => {
  const values = { ...req.body };
  try {
    const email = normalizarEmail(values.email);
    if (!values.nombre || !values.apellido || !email || typeof values.password !== 'string' || values.password.length < 8) {
      return res.status(400).render('publicos/registro', { layout: false, error: 'Completa los datos y usa una contraseña de al menos 8 caracteres.', form_post: new URLSearchParams(values).toString() });
    }
    const usuario = await Usuario.create({ nombre: values.nombre, apellido: values.apellido, email, password: values.password, telefono: values.telefono });
    setSessionCookie(res, generarToken(usuario._id));
    return res.redirect(values.next ? nextUrl(values.next) : '/perfil');
  } catch (error) {
    return res.status(400).render('publicos/registro', { layout: false, error: errorMessage(error, 'No se pudo crear la cuenta.'), form_post: new URLSearchParams(values).toString() });
  }
};

const logout = (req, res) => {
  clearSessionCookie(res);
  res.redirect('/');
};

const dashboard = (req, res) => res.redirect(dashboardUrl(req.usuario));

const solicitarRecuperacion = async (req, res) => {
  const email = normalizarEmail(req.body.email);
  if (email) {
    const usuario = await Usuario.findOne({ email });
    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex');
      usuario.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
      usuario.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await usuario.save();
      const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      await transporter.sendMail({
        from: `"TecnoCorte" <${process.env.EMAIL_USER}>`,
        to: usuario.email,
        subject: 'Restablece tu contraseña de TecnoCorte',
        html: `<p>Solicitaste cambiar tu contraseña.</p><p><a href="${base}/restablecer-password/${token}">Crear nueva contraseña</a></p><p>Este enlace vence en una hora.</p>`
      }).catch((error) => console.error('Error al enviar recuperación:', error.message));
    }
  }
  return res.render('publicos/recuperar_password', { layout: 'layouts/base', title: 'Recuperar contraseña', enviado: true });
};

const renderReset = async (req, res, error = '') => {
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const usuario = await Usuario.findOne({ resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } });
  return res.render('publicos/restablecer_password', { layout: 'layouts/base', title: 'Restablecer contraseña', token: req.params.token, valido: Boolean(usuario), error });
};

const restablecerPassword = async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const usuario = await Usuario.findOne({ resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } }).select('+resetPasswordToken +resetPasswordExpires');
  if (!usuario) return renderReset(req, res, 'El enlace no es válido o ya expiró.');
  if (req.body.password !== req.body.password_confirm || typeof req.body.password !== 'string' || req.body.password.length < 8) {
    return res.status(400).render('publicos/restablecer_password', { layout: 'layouts/base', title: 'Restablecer contraseña', token: req.params.token, valido: true, error: 'Las contraseñas deben coincidir y tener al menos 8 caracteres.' });
  }
  usuario.password = req.body.password;
  usuario.resetPasswordToken = undefined;
  usuario.resetPasswordExpires = undefined;
  await usuario.save();
  return res.redirect('/login');
};

const ayuda = async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;
  if (!nombre || !email || !asunto || !mensaje) return res.status(400).render('publicos/ayuda', { layout: false, error: 'Completa todos los campos.', form_post: new URLSearchParams({ nombre: nombre || '', email: email || '', asunto: asunto || '', mensaje: mensaje || '' }).toString() });
  await Mensaje.create({ nombre, email: normalizarEmail(email), asunto, mensaje });
  await transporter.sendMail({ from: `"${nombre}" <${email}>`, to: process.env.EMAIL_USER, subject: `[TecnoCorte] ${asunto}`, text: mensaje }).catch((error) => console.error('Error al enviar contacto:', error.message));
  return res.render('publicos/ayuda', { layout: false, exito: 'Tu mensaje fue enviado correctamente.' });
};

const cargarProductos = async () => (await Producto.find().sort({ createdAt: -1 })).map((producto) => {
  const value = plain(producto);
  value.categoria_display = value.categoria || '';
  value.get_categoria_display = value.categoria || '';
  return value;
});

const tienda = async (req, res) => res.render('usuarios/usuario_tienda', { layout: false, active: 'tienda', productos: await cargarProductos() });
const peluquerias = async (req, res) => res.render('usuarios/usuario_peluquerias', { layout: false, active: 'barberias', peluquerias: (await Peluqueria.find()).map(plain) });
const servicios = (req, res) => res.render('usuarios/usuario_servicios', { layout: false, active: 'servicios' });

const horariosBase = () => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((day) => [day, { activo: day < 6, inicio: '09:00', fin: '18:00' }]));

const reservarCita = async (req, res) => {
  const peluqueriasData = (await Peluqueria.find()).map(plain);
  const barberos = (await Usuario.find({ rol: 'Barbero', activo: { $ne: false } })).map((barbero) => ({ ...plain(barbero), peluqueria_id: barbero.peluqueria_id ? String(barbero.peluqueria_id) : '' }));
  const reservas = (await Reserva.find({ fecha: { $gte: new Date() } }).select('peluquero fecha hora minutos')).map((reserva) => ({ barbero: String(reserva.peluquero), fecha: new Date(reserva.fecha).toISOString().slice(0, 10), hora: reserva.hora, minutos: reserva.minutos || 30 }));
  const horarios = Object.fromEntries(peluqueriasData.map((peluqueria) => [peluqueria.id, horariosBase()]));
  const horariosGuardados = await Horario.find({ peluqueria: { $in: peluqueriasData.map((peluqueria) => peluqueria.id) } });
  horariosGuardados.forEach((horario) => {
    if (horarios[String(horario.peluqueria)]) horarios[String(horario.peluqueria)][horario.dia_semana] = { activo: horario.activo, inicio: horario.hora_inicio, fin: horario.hora_fin };
  });
  const bloqueos = (await Bloqueo.find({ peluqueria: { $in: peluqueriasData.map((peluqueria) => peluqueria.id) }, fecha: { $gte: new Date() } })).map((bloqueo) => ({ fecha: new Date(bloqueo.fecha).toISOString().slice(0, 10), hora: bloqueo.hora || null }));
  const now = new Date();
  return res.render('usuarios/usuario_reservar_cita', {
    layout: false,
    peluquerias: peluqueriasData,
    peluqueros: barberos,
    servicios: SERVICIOS,
    horarios_json: JSON.stringify(horarios),
    bloqueos_json: JSON.stringify(bloqueos),
    reservas_json: JSON.stringify(reservas),
    fecha_hoy: now.toISOString().slice(0, 10),
    hora_actual: now.toTimeString().slice(0, 5),
    servicio_inicial: req.query.servicio || '',
    peluqueria_inicial: req.query.peluqueria || '',
    error: req.query.error || '',
    form_post: ''
  });
};

const findServicio = (nombre) => SERVICIOS.find((servicio) => servicio.nombre === nombre);
const minutosHora = (value) => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : -1;
};
const fechaLocal = (fecha, hora = '00:00') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) || !/^\d{2}:\d{2}$/.test(String(hora))) return null;
  const value = new Date(`${fecha}T${hora}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};
const dosHorasAntes = (fecha, hora) => {
  const inicio = fechaLocal(fecha, hora);
  return inicio && inicio.getTime() - Date.now() >= 2 * 60 * 60 * 1000;
};
const diaHorario = (fecha) => {
  const date = fechaLocal(fecha);
  return date ? (date.getDay() + 6) % 7 : -1;
};
const reservasSolapadas = async ({ peluquero, fecha, hora, minutos, excluir }) => {
  const inicio = minutosHora(hora);
  const fin = inicio + minutos;
  const reservas = await Reserva.find({ peluquero, fecha: new Date(`${fecha}T00:00:00`), estado: { $in: ['Pendiente', 'Confirmada', 'Completada', 'Reprogramar'] }, ...(excluir ? { _id: { $ne: excluir } } : {}) }).select('hora minutos');
  return reservas.some((reserva) => {
    const reservaInicio = minutosHora(reserva.hora);
    return inicio < reservaInicio + (reserva.minutos || 30) && fin > reservaInicio;
  });
};
const validarCita = async ({ peluqueria, peluquero, fecha, hora, minutos, excluir, exigirDosHoras = false }) => {
  if (!esId(peluqueria) || !esId(peluquero)) return 'La barbería o el barbero no son válidos.';
  const inicio = fechaLocal(fecha, hora);
  if (!inicio || inicio <= new Date()) return 'La fecha y hora deben estar en el futuro.';
  if (exigirDosHoras && !dosHorasAntes(fecha, hora)) return 'Los cambios y cancelaciones deben hacerse con al menos 2 horas de anticipación.';
  const [barbero, horario, bloqueo] = await Promise.all([
    Usuario.findOne({ _id: peluquero, rol: 'Barbero', activo: { $ne: false }, peluqueria_id: peluqueria }).select('nombre apellido email'),
    Horario.findOne({ peluqueria, dia_semana: diaHorario(fecha), activo: true }),
    Bloqueo.findOne({ peluqueria, fecha: new Date(`${fecha}T00:00:00`), $or: [{ hora: null }, { hora }] })
  ]);
  if (!barbero) return 'El barbero no está disponible para esta barbería.';
  if (!horario) return 'La barbería no atiende ese día.';
  const inicioMin = minutosHora(hora);
  const finMin = inicioMin + minutos;
  if (inicioMin < minutosHora(horario.hora_inicio) || finMin > minutosHora(horario.hora_fin)) return 'La hora está fuera del horario de atención.';
  if (bloqueo) return 'Ese horario está bloqueado.';
  if (await reservasSolapadas({ peluquero, fecha, hora, minutos, excluir })) return 'Ese horario ya está ocupado. Elige otra hora.';
  return null;
};
const notificarReserva = async (reservaId, evento) => {
  const reserva = await Reserva.findById(reservaId).populate('cliente peluquero peluqueria');
  if (!reserva) return;
  const fecha = new Date(reserva.fecha).toLocaleDateString('es-CO');
  const destinatarios = [reserva.cliente?.email, reserva.peluquero?.email].filter(Boolean);
  if (!destinatarios.length || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  const asunto = `TecnoCorte: ${evento} - ${reserva.servicio || 'cita'}`;
  const texto = `Hola,\n\nLa cita de ${reserva.servicio || 'servicio'} para el ${fecha} a las ${reserva.hora} en ${reserva.peluqueria?.nombre || 'TecnoCorte'} fue ${evento.toLowerCase()}.\n\nSi necesitas modificarla, entra a tu panel de TecnoCorte.`;
  await Promise.allSettled(destinatarios.map((to) => transporter.sendMail({ from: `TecnoCorte <${process.env.EMAIL_USER}>`, to, subject: asunto, text: texto })));
};
const notificarSuspension = async (reservaId) => {
  const reserva = await Reserva.findById(reservaId).populate('cliente peluquero peluqueria');
  if (!reserva?.cliente?.email || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  await transporter.sendMail({
    from: `TecnoCorte <${process.env.EMAIL_USER}>`,
    to: reserva.cliente.email,
    subject: 'TecnoCorte: debes reprogramar tu cita',
    text: `Hola ${reserva.cliente.nombre}, el barbero ${reserva.peluquero?.nombre || ''} no está disponible para tu cita del ${new Date(reserva.fecha).toLocaleDateString('es-CO')} a las ${reserva.hora}. Entra a tu perfil para modificarla y elegir otro barbero.`
  }).catch(() => {});
};

const preConfirmar = async (req, res) => {
  const servicio = findServicio(req.body.servicio);
  if (!servicio || !esId(req.body.peluqueria) || !esId(req.body.peluquero) || !req.body.fecha || !req.body.hora) return res.redirect('/reservar-cita');
  const [peluqueria, peluquero] = await Promise.all([Peluqueria.findById(req.body.peluqueria), Usuario.findOne({ _id: req.body.peluquero, rol: 'Barbero', activo: { $ne: false } })]);
  if (!peluqueria || !peluquero) return res.redirect('/reservar-cita');
  const datos = { servicio: servicio.nombre, duracion: servicio.minutos, fecha: req.body.fecha, hora: req.body.hora, peluqueria: plain(peluqueria), peluquero: plain(peluquero) };
  return res.render('usuarios/usuario_confirmar_reserva', { layout: false, datos });
};

const confirmarReserva = async (req, res) => {
  const servicio = findServicio(req.body.servicio);
  if (!servicio) return res.redirect('/reservar-cita?error=' + encodeURIComponent('Selecciona un servicio válido.'));
  const error = await validarCita({ peluqueria: req.body.peluqueria, peluquero: req.body.peluquero, fecha: req.body.fecha, hora: req.body.hora, minutos: servicio.minutos });
  if (error) return res.redirect('/reservar-cita?error=' + encodeURIComponent(error));
  let reserva;
  try {
    reserva = await Reserva.create({ cliente: req.usuario._id, peluqueria: req.body.peluqueria, peluquero: req.body.peluquero, fecha: new Date(`${req.body.fecha}T00:00:00`), hora: req.body.hora, servicio: servicio.nombre, minutos: servicio.minutos });
  } catch (creationError) {
    const message = creationError.code === 11000 ? 'Ese horario acaba de ser reservado por otra persona. Elige otra hora.' : 'No se pudo reservar la cita. Inténtalo de nuevo.';
    return res.redirect('/reservar-cita?error=' + encodeURIComponent(message));
  }
  void notificarReserva(reserva._id, 'reservada');
  return res.redirect('/perfil');
};

const confirmarCita = async (req, res) => {
  const reserva = await Reserva.findOneAndUpdate({ _id: req.params.id, cliente: req.usuario._id, estado: 'Pendiente' }, { estado: 'Confirmada' }, { new: true });
  if (reserva) void notificarReserva(reserva._id, 'confirmada');
  return res.redirect('/notificaciones');
};

const cargarPedidosUsuario = async (usuarioId) => {
  const pedidos = await Pedido.find({ cliente: usuarioId }).sort({ createdAt: -1 });
  return Promise.all(pedidos.map(async (pedido) => {
    const items = await PedidoProducto.find({ pedido: pedido._id }).populate('producto');
    return { ...plain(pedido), productos: items.map((item) => ({ producto: plain(item.producto), cantidad: item.cantidad, precio: item.precio })) };
  }));
};

const perfil = async (req, res) => {
  const reservas = await Reserva.find({ cliente: req.usuario._id }).populate('peluqueria peluquero').sort({ fecha: -1 });
  const citas = reservas.map((reserva) => ({ ...plain(reserva), peluqueria: plain(reserva.peluqueria), peluquero: plain(reserva.peluquero) || { nombre: '', apellido: '', activo: false }, peluqueria_id: String(reserva.peluqueria?._id || ''), peluquero_id: String(reserva.peluquero?._id || '') }));
  const calificaciones = await Calificacion.find({ cliente: req.usuario._id }).select('reserva').lean();
  return res.render('usuarios/usuario_perfil', { layout: false, usuario: usuarioView(req.usuario), citas, pedidos: await cargarPedidosUsuario(req.usuario._id), calificaciones_reservas: calificaciones.map((item) => String(item.reserva)) });
};

const actualizarPerfil = async (req, res) => {
  const usuario = await Usuario.findById(req.usuario._id);
  if (!usuario) return res.redirect('/login');
  usuario.nombre = String(req.body.nombre || '').trim();
  usuario.apellido = String(req.body.apellido || '').trim();
  usuario.telefono = String(req.body.telefono || '').trim();
  if (req.file) {
    usuario.foto.url = `/uploads/${req.file.filename}`;
    usuario.foto.public_id = req.file.filename;
  }
  if (!usuario.nombre || !usuario.apellido) return res.redirect('/perfil');
  await usuario.save();
  return res.redirect('/perfil');
};

const editarReserva = async (req, res) => {
  const reserva = await Reserva.findOne({ _id: req.params.id, cliente: req.usuario._id }).populate('peluquero peluqueria');
  if (!reserva) return res.redirect('/perfil');
  return res.render('usuarios/usuario_editar_reserva', { layout: 'layouts/dashboard', title: 'Modificar cita', error: req.query.error || '', reserva: { ...plain(reserva), peluquero: plain(reserva.peluquero) || { activo: false }, peluqueria_id: String(reserva.peluqueria?._id || ''), peluquero_id: String(reserva.peluquero?._id || '') }, servicios: SERVICIOS, peluquerias: (await Peluqueria.find()).map(plain), peluqueros: (await Usuario.find({ rol: 'Barbero' })).map(plain) });
};

const actualizarReserva = async (req, res) => {
  const servicio = findServicio(req.body.servicio);
  const current = await Reserva.findOne({ _id: req.params.id, cliente: req.usuario._id });
  if (!current) return res.redirect('/perfil');
  if (!servicio || !dosHorasAntes(current.fecha.toISOString().slice(0, 10), current.hora)) return res.redirect(`/editar-reserva/${req.params.id}?error=${encodeURIComponent('Los cambios deben hacerse con al menos 2 horas de anticipación.')}`);
  const error = await validarCita({ peluqueria: req.body.peluqueria, peluquero: req.body.peluquero, fecha: req.body.fecha, hora: req.body.hora, minutos: servicio.minutos, excluir: current._id });
  if (error) return res.redirect(`/editar-reserva/${req.params.id}?error=${encodeURIComponent(error)}`);
  try {
    await Reserva.findOneAndUpdate({ _id: current._id }, { servicio: servicio.nombre, peluqueria: req.body.peluqueria, peluquero: req.body.peluquero, fecha: new Date(`${req.body.fecha}T00:00:00`), hora: req.body.hora, minutos: servicio.minutos, estado: 'Pendiente', requiere_reprogramacion: false, motivo_reprogramacion: '' }, { runValidators: true });
  } catch (updateError) {
    const message = updateError.code === 11000 ? 'Ese horario ya está ocupado.' : 'No se pudo modificar la cita.';
    return res.redirect(`/editar-reserva/${req.params.id}?error=${encodeURIComponent(message)}`);
  }
  void notificarReserva(current._id, 'modificada');
  return res.redirect('/perfil');
};

const cancelarReserva = async (req, res) => {
  const reserva = await Reserva.findOne({ _id: req.params.id, cliente: req.usuario._id, estado: { $nin: ['Completada', 'Cancelada'] } });
  if (reserva && dosHorasAntes(reserva.fecha.toISOString().slice(0, 10), reserva.hora)) {
    await Reserva.findByIdAndUpdate(reserva._id, { estado: 'Cancelada' });
    void notificarReserva(reserva._id, 'cancelada');
  }
  return res.redirect('/perfil');
};

const calificar = async (req, res) => {
  const reserva = await Reserva.findOne({ _id: req.params.id, cliente: req.usuario._id, estado: 'Completada' });
  const puntuacion = Number(req.body.puntuacion);
  if (reserva && Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5) {
    await Calificacion.findOneAndUpdate({ reserva: reserva._id }, { reserva: reserva._id, cliente: req.usuario._id, peluquero: reserva.peluquero, puntuacion, comentario: String(req.body.comentario || '').slice(0, 1000) }, { upsert: true, runValidators: true });
  }
  return res.redirect('/perfil');
};

const cambiarPassword = async (req, res) => {
  const view = { layout: 'layouts/dashboard', title: 'Cambiar contraseña', usuario: usuarioView(req.usuario) };
  if (req.method === 'GET') return res.render('usuarios/cambiar_password', view);
  const { password_actual, password, password_confirm } = req.body;
  const usuario = await Usuario.findById(req.usuario._id).select('+password');
  if (!usuario || !(await usuario.compararPassword(password_actual)) || password !== password_confirm || typeof password !== 'string' || password.length < 8) return res.status(400).render('usuarios/cambiar_password', { ...view, error: 'Revisa la contraseña actual y confirma una contraseña nueva de al menos 8 caracteres.' });
  usuario.password = password;
  await usuario.save();
  return res.redirect('/perfil');
};

const cartData = async (req) => {
  const raw = readCart(req).filter((item) => esId(item.producto) && Number.isInteger(Number(item.cantidad)) && Number(item.cantidad) > 0);
  const products = await Producto.find({ _id: { $in: raw.map((item) => item.producto) } });
  const byId = new Map(products.map((product) => [String(product._id), product]));
  const cart = [];
  const items = [];
  let total = 0;
  let cantidad = 0;
  for (const item of raw) {
    const product = byId.get(String(item.producto));
    if (!product) continue;
    const productQuantity = Math.min(Number(item.cantidad), 99);
    const subtotal = productQuantity * product.precio;
    cart.push({ producto: String(product._id), cantidad: productQuantity });
    items.push({ producto: plain(product), cantidad: productQuantity, subtotal });
    cantidad += productQuantity;
    total += subtotal;
  }
  return { cart, items, cantidad, total };
};

const cartResponse = (req, res, data) => {
  if (req.get('X-Requested-With') === 'XMLHttpRequest' || req.accepts('json') === 'json') return res.json(data);
  return res.redirect('/carrito');
};

const agregarCarrito = async (req, res) => {
  if (!esId(req.params.id)) return res.status(400).json({ error: 'Producto inválido.' });
  const product = await Producto.findOne({ _id: req.params.id, disponible: true, stock: { $gt: 0 } });
  if (!product) return res.status(404).json({ error: 'El producto no está disponible.' });
  const data = await cartData(req);
  const item = data.cart.find((entry) => entry.producto === String(req.params.id));
  if (item) item.cantidad = Math.min(item.cantidad + 1, product.stock, 99);
  else data.cart.push({ producto: String(req.params.id), cantidad: 1 });
  const responseData = await cartData({ ...req, headers: { ...req.headers, cookie: `${data.cart.map((entry) => `tc_cart=${encodeURIComponent(JSON.stringify(data.cart))}`).join(';')}` } });
  writeCart(res, data.cart);
  return cartResponse(req, res, { mensaje: 'Producto agregado al carrito.', cantidad: responseData.cantidad, total: responseData.total });
};

const actualizarCarrito = async (req, res) => {
  const data = await cartData(req);
  const item = data.cart.find((entry) => entry.producto === String(req.params.id));
  if (!item) return cartResponse(req, res, { error: 'El producto no está en el carrito.' });
  item.cantidad = req.body.accion === 'decrementar' ? item.cantidad - 1 : item.cantidad + 1;
  if (item.cantidad <= 0) data.cart.splice(data.cart.indexOf(item), 1);
  writeCart(res, data.cart);
  const updated = await cartData({ ...req, headers: { ...req.headers, cookie: `tc_cart=${encodeURIComponent(JSON.stringify(data.cart))}` } });
  const current = updated.items.find((entry) => entry.producto.id === String(req.params.id));
  return cartResponse(req, res, { cantidad: updated.cantidad, total: updated.total, item_cantidad: current?.cantidad || 0, subtotal: current?.subtotal || 0, empty: updated.items.length === 0 });
};

const eliminarCarrito = async (req, res) => {
  const data = await cartData(req);
  writeCart(res, data.cart.filter((item) => item.producto !== String(req.params.id)));
  const updated = await cartData({ ...req, headers: { ...req.headers, cookie: `tc_cart=${encodeURIComponent(JSON.stringify(data.cart.filter((item) => item.producto !== String(req.params.id))))}` } });
  return cartResponse(req, res, { cantidad: updated.cantidad, total: updated.total, item_cantidad: 0, empty: updated.items.length === 0 });
};

const verCarrito = async (req, res) => {
  const data = await cartData(req);
  writeCart(res, data.cart);
  return res.render('carrito/carrito', { layout: false, items: data.items, cantidad: data.cantidad, total: data.total });
};

const finalizarCompra = async (req, res) => {
  const data = await cartData(req);
  if (req.method === 'GET') return res.render('carrito/finalizar_pedido', { layout: false, items: data.items, cantidad: data.cantidad, total: data.total });
  if (!data.items.length) return res.redirect('/carrito');
  const actualizados = [];
  try {
    for (const item of data.items) {
      const actualizado = await Producto.findOneAndUpdate(
        { _id: item.producto.id, disponible: true, stock: { $gte: item.cantidad } },
        { $inc: { stock: -item.cantidad } },
        { new: true }
      );
      if (!actualizado) throw new Error('Uno de los productos ya no tiene stock suficiente.');
      actualizados.push(item);
    }
    const pedido = await Pedido.create({ cliente: req.usuario._id, total: data.total });
    await PedidoProducto.insertMany(data.items.map((item) => ({ pedido: pedido._id, producto: item.producto.id, cantidad: item.cantidad, precio: item.producto.precio })));
    writeCart(res, []);
    return res.redirect(`/pedido-exitoso/${pedido._id}`);
  } catch (error) {
    await Promise.all(actualizados.map((item) => Producto.findByIdAndUpdate(item.producto.id, { $inc: { stock: item.cantidad } })));
    return res.status(409).render('carrito/finalizar_pedido', { layout: false, items: data.items, cantidad: data.cantidad, total: data.total, error: error.message });
  }
};

const pedidoExitoso = async (req, res) => {
  const pedido = await Pedido.findOne({ _id: req.params.id, cliente: req.usuario._id });
  if (!pedido) return res.redirect('/perfil');
  return res.render('carrito/pedido_exitoso', { layout: false, pedido: plain(pedido) });
};

const adminUsuarios = async (req, res) => res.render('administrador/admin_usuarios', { layout: 'layouts/dashboard', usuarios: (await Usuario.find().select('-password').sort({ createdAt: -1 })).map(plain) });

const adminFormularioUsuario = async (req, res) => {
  const usuario = req.params.id ? plain(await Usuario.findById(req.params.id).select('-password')) : null;
  return res.render('administrador/admin_formulario_usuario', { layout: 'layouts/dashboard', usuario, editar: Boolean(usuario), roles: ROLES, peluquerias: (await Peluqueria.find()).map(plain) });
};

const adminGuardarUsuario = async (req, res) => {
  try {
    const values = req.body;
    const fields = { nombre: values.nombre, apellido: values.apellido, email: normalizarEmail(values.email), telefono: values.telefono, rol: values.rol, peluqueria_id: values.peluqueria || undefined };
    let usuario = req.params.id ? await Usuario.findById(req.params.id).select('+password') : new Usuario(fields);
    if (!usuario) return res.redirect('/admin/usuarios');
    Object.assign(usuario, fields);
    if (values.password) usuario.password = values.password;
    if (!req.params.id && (!values.password || values.password.length < 8)) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    await usuario.save();
    return res.redirect('/admin/usuarios');
  } catch (error) {
    return res.status(400).render('administrador/admin_formulario_usuario', { layout: 'layouts/dashboard', usuario: req.params.id ? { ...req.body, id: req.params.id } : req.body, editar: Boolean(req.params.id), roles: ROLES, peluquerias: (await Peluqueria.find()).map(plain), error: errorMessage(error, error.message) });
  }
};

const adminSuspenderUsuario = async (req, res) => {
  if (String(req.params.id) === String(req.usuario._id)) return res.redirect('/admin/usuarios');
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) return res.redirect(req.path.includes('peluqueros') ? '/admin/peluqueros' : '/admin/usuarios');
  const suspender = usuario.activo !== false;
  usuario.activo = !suspender;
  await usuario.save();
  if (suspender && usuario.rol === 'Barbero') {
    const futuras = await Reserva.find({ peluquero: usuario._id, fecha: { $gte: new Date() }, estado: { $in: ['Pendiente', 'Confirmada', 'Reprogramar'] } }).select('_id');
    await Reserva.updateMany({ _id: { $in: futuras.map((item) => item._id) } }, { $set: { requiere_reprogramacion: true, motivo_reprogramacion: 'El barbero fue suspendido. Selecciona otro barbero.' } });
    futuras.forEach((reserva) => void notificarSuspension(reserva._id));
  }
  return res.redirect(req.path.includes('peluqueros') ? '/admin/peluqueros' : '/admin/usuarios');
};

const adminPeluqueros = async (req, res) => res.render('administrador/admin_listar_peluqueros', { layout: 'layouts/dashboard', datos: (await Usuario.find({ rol: 'Barbero' }).select('-password').sort({ nombre: 1 })).map(plain) });

const adminFormularioPeluquero = async (req, res) => {
  const datos = req.params.id ? plain(await Usuario.findById(req.params.id).select('-password')) : null;
  return res.render('administrador/admin_formulario_peluquero', { layout: 'layouts/dashboard', datos, peluquerias: (await Peluqueria.find()).map(plain) });
};

const adminGuardarPeluquero = async (req, res) => {
  const values = req.body;
  const fields = { nombre: values.nombre, apellido: values.apellido, email: normalizarEmail(values.email), telefono: values.telefono, rol: 'Barbero', peluqueria_id: values.peluqueria || undefined };
  try {
    let usuario = req.params.id ? await Usuario.findById(req.params.id).select('+password') : new Usuario(fields);
    if (!usuario) return res.redirect('/admin/peluqueros');
    Object.assign(usuario, fields);
    if (values.password) usuario.password = values.password;
    if (!req.params.id && (!values.password || values.password.length < 8)) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    await usuario.save();
    return res.redirect('/admin/peluqueros');
  } catch (error) {
    return res.status(400).render('administrador/admin_formulario_peluquero', { layout: 'layouts/dashboard', datos: { ...values, id: req.params.id }, peluquerias: (await Peluqueria.find()).map(plain), error: errorMessage(error, error.message) });
  }
};

const adminReservas = async (req, res) => {
  const datos = (await Reserva.find().populate('cliente peluqueria peluquero').sort({ fecha: -1 })).map((reserva) => ({ ...plain(reserva), cliente: plain(reserva.cliente) || { nombre: 'Sin cliente', apellido: '' }, peluqueria: plain(reserva.peluqueria) || { nombre: 'Sin peluquería' }, peluquero: plain(reserva.peluquero) || { nombre: 'Sin asignar', apellido: '' } }));
  return res.render('administrador/admin_listar_reservas', { layout: 'layouts/dashboard', datos });
};

const adminFormularioReserva = async (req, res) => {
  const reserva = req.params.id ? await Reserva.findById(req.params.id).populate('cliente peluqueria peluquero') : null;
  const datos = reserva ? { ...plain(reserva), cliente_id: String(reserva.cliente?._id || ''), peluqueria_id: String(reserva.peluqueria?._id || ''), peluquero_id: String(reserva.peluquero?._id || '') } : null;
  return res.render('administrador/admin_formulario_reserva', { layout: 'layouts/dashboard', datos, clientes: (await Usuario.find({ rol: 'Cliente' }).select('-password')).map(plain), peluqueros: (await Usuario.find({ rol: 'Barbero', activo: { $ne: false } }).select('-password')).map(plain), peluquerias: (await Peluqueria.find()).map(plain), servicios: SERVICIOS.map((service) => ({ ...service, duracion: service.duracion })), estado: ESTADOS_RESERVA });
};

const adminGuardarReserva = async (req, res) => {
  const service = findServicio(req.body.servicio);
  const values = { cliente: req.body.cliente, peluqueria: req.body.peluqueria, peluquero: req.body.peluquero, servicio: req.body.servicio, fecha: req.body.fecha, hora: req.body.hora, estado: req.body.estado || 'Pendiente', minutos: service?.minutos || 30 };
  if (!service || !esId(values.cliente) || !esId(values.peluqueria) || !esId(values.peluquero)) return res.redirect('/admin/reservas');
  const error = await validarCita({ ...values, fecha: values.fecha, minutos: values.minutos, excluir: req.params.id });
  if (error) return res.redirect('/admin/reservas?error=' + encodeURIComponent(error));
  let reserva;
  try {
    reserva = req.params.id ? await Reserva.findOneAndUpdate({ _id: req.params.id }, values, { new: true, runValidators: true }) : await Reserva.create({ ...values, fecha: new Date(`${values.fecha}T00:00:00`) });
  } catch (creationError) {
    return res.redirect('/admin/reservas?error=' + encodeURIComponent(creationError.code === 11000 ? 'Ese horario ya está ocupado.' : 'No se pudo guardar la cita.'));
  }
  if (reserva) void notificarReserva(reserva._id, req.params.id ? 'modificada' : 'reservada');
  return res.redirect('/admin/reservas');
};

const adminCancelarReserva = async (req, res) => {
  const reserva = await Reserva.findByIdAndUpdate(req.params.id, { estado: 'Cancelada' }, { new: true });
  if (reserva) void notificarReserva(reserva._id, 'cancelada');
  return res.redirect('/admin/reservas');
};

const adminPeluquerias = async (req, res) => res.render('administrador/admin_peluquerias', { layout: 'layouts/dashboard', peluquerias: (await Peluqueria.find()).map(plain) });

const adminFormularioPeluqueria = async (req, res) => res.render('administrador/admin_formulario_peluqueria', { layout: 'layouts/dashboard', peluqueria: req.params.id ? plain(await Peluqueria.findById(req.params.id)) : null });

const adminGuardarPeluqueria = async (req, res) => {
  const values = { nombre: req.body.nombre, ubicacion: req.body.ubicacion, telefono: req.body.telefono };
  if (req.params.id) await Peluqueria.findByIdAndUpdate(req.params.id, values, { runValidators: true });
  else await Peluqueria.create(values);
  return res.redirect('/admin/peluquerias');
};

const adminEliminarPeluqueria = async (req, res) => {
  await Peluqueria.findByIdAndDelete(req.params.id);
  return res.redirect('/admin/peluquerias');
};

const adminProductos = async (req, res) => res.render('administrador/admin_productos', { layout: 'layouts/dashboard', productos: await cargarProductos() });

const adminFormularioProducto = async (req, res) => res.render('administrador/admin_formulario_producto', { layout: 'layouts/dashboard', producto: req.params.id ? plain(await Producto.findById(req.params.id)) : null, categorias: CATEGORIAS });

const adminGuardarProducto = async (req, res) => {
  const values = { nombre: req.body.nombre, descripcion: req.body.descripcion, precio: Number(req.body.precio), stock: Number(req.body.stock), categoria: req.body.categoria, disponible: req.body.disponible === 'on' };
  if (req.params.id) await Producto.findByIdAndUpdate(req.params.id, values, { runValidators: true });
  else await Producto.create(values);
  return res.redirect('/admin/productos');
};

const adminEliminarProducto = async (req, res) => {
  await Producto.findByIdAndDelete(req.params.id);
  return res.redirect('/admin/productos');
};

const adminDashboard = async (req, res) => {
  const [reservas, totalUsuarios, totalClientes, totalPeluquerias, totalProductos, pedidos] = await Promise.all([
    Reserva.find().populate('cliente peluquero peluqueria').sort({ fecha: -1 }),
    Usuario.countDocuments(),
    Usuario.countDocuments({ rol: 'Cliente' }),
    Peluqueria.countDocuments(),
    Producto.countDocuments(),
    Pedido.find().select('total')
  ]);
  const estados = reservas.reduce((result, reserva) => { result[reserva.estado] = (result[reserva.estado] || 0) + 1; return result; }, {});
  const ventasServicios = reservas.filter((reserva) => reserva.estado === 'Completada').reduce((total, reserva) => total + (findServicio(reserva.servicio)?.precio || 0), 0);
  const ventasProductos = pedidos.reduce((total, pedido) => total + (Number(pedido.total) || 0), 0);
  return res.render('administrador/admin_dashboard', {
    layout: 'layouts/dashboard',
    estados,
    maximo: Math.max(1, ...Object.values(estados)),
    total: ventasServicios + ventasProductos,
    ventas_servicios: ventasServicios,
    ventas_productos: ventasProductos,
    total_clientes: totalClientes,
    total_usuarios: totalUsuarios,
    total_peluquerias: totalPeluquerias,
    total_productos: totalProductos,
    ultimas_reservas: reservas.slice(0, 5).map((reserva) => ({ ...plain(reserva), cliente: plain(reserva.cliente) || { nombre: 'Sin cliente', apellido: '' }, peluquero: plain(reserva.peluquero) || { nombre: 'Sin asignar', apellido: '' } }))
  });
};

const adminHorarios = async (req, res) => {
  const peluqueriasData = (await Peluqueria.find()).map(plain);
  const actual = req.query.peluqueria ? peluqueriasData.find((item) => item.id === req.query.peluqueria) : peluqueriasData[0];
  const horarios = actual ? await Horario.find({ peluqueria: actual.id }).sort({ dia_semana: 1 }) : [];
  const horariosView = [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const value = horarios.find((item) => item.dia_semana === day);
    return { dia_semana: day, dia_semana_display: DIAS[day], activo: value?.activo ?? day < 6, hora_inicio: value?.hora_inicio || '09:00', hora_fin: value?.hora_fin || '18:00' };
  });
  const bloqueos = actual ? (await Bloqueo.find({ peluqueria: actual.id }).sort({ fecha: 1 })).map(plain) : [];
  return res.render('administrador/admin_horarios', { layout: 'layouts/dashboard', peluquerias: peluqueriasData, peluqueria_actual: actual, horarios: horariosView, bloqueos });
};

const adminGuardarHorarios = async (req, res) => {
  const peluqueria = req.body.peluqueria_seleccionada;
  if (esId(peluqueria)) {
    await Promise.all([0, 1, 2, 3, 4, 5, 6].map((day) => Horario.findOneAndUpdate({ peluqueria, dia_semana: day }, { peluqueria, dia_semana: day, activo: Boolean(req.body[`activo_${day}`]), hora_inicio: req.body[`inicio_${day}`] || '09:00', hora_fin: req.body[`fin_${day}`] || '18:00' }, { upsert: true, runValidators: true })));
  }
  return res.redirect(`/admin/horarios?peluqueria=${peluqueria}`);
};

const adminCrearBloqueo = async (req, res) => {
  if (esId(req.body.peluqueria_seleccionada) && req.body.fecha) await Bloqueo.create({ peluqueria: req.body.peluqueria_seleccionada, fecha: req.body.fecha, hora: req.body.hora || null, motivo: req.body.motivo });
  return res.redirect(`/admin/horarios?peluqueria=${req.body.peluqueria_seleccionada}`);
};

const adminEliminarBloqueo = async (req, res) => {
  await Bloqueo.findByIdAndDelete(req.params.id);
  return res.redirect('/admin/horarios');
};

const adminMensajes = async (req, res) => res.render('administrador/admin_mensajes', { layout: 'layouts/dashboard', mensajes: (await Mensaje.find().sort({ createdAt: -1 })).map(plain) });

const adminIngresos = async (req, res) => {
  const filtro = ['Cliente', 'Barbero', 'Admin'].includes(req.query.rol) ? { rol: req.query.rol } : {};
  const ingresos = (await Ingreso.find(filtro).populate('usuario').sort({ fecha: -1 })).filter((item) => item.usuario).map((item) => ({ ...plain(item), usuario: plain(item.usuario), rol: item.rol }));
  return res.render('administrador/admin_listar_ingresos', { layout: 'layouts/dashboard', ingresos, rol_filtro: req.query.rol || '' });
};

const barberoDashboard = async (req, res) => {
  const citas = (await Reserva.find({ peluquero: req.usuario._id }).populate('cliente peluqueria').sort({ fecha: 1 })).map((reserva) => ({ ...plain(reserva), cliente: plain(reserva.cliente), peluqueria: plain(reserva.peluqueria) }));
  const citasHoy = citas.filter((cita) => new Date(cita.fecha).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10));
  const completadas = citas.filter((cita) => cita.estado === 'Completada');
  return res.render('peluqueros/peluquero_dashboard', { layout: 'layouts/dashboard', citas, citas_hoy: citasHoy, citas_pendientes: citas.filter((cita) => cita.estado === 'Pendiente'), citas_completadas: completadas, citas_canceladas: citas.filter((cita) => cita.estado === 'Cancelada'), total_citas: citas.length, ingresos_hoy: 0, ingresos_total: completadas.length, calificaciones: [], promedio: 0, total_calificaciones: 0 });
};

const barberoNuevaCita = async (req, res) => res.render('peluqueros/peluquero_crear_cita', { layout: 'layouts/dashboard', error: req.query.error || '', clientes: (await Usuario.find({ rol: 'Cliente', activo: { $ne: false } })).map(plain), peluquerias: (await Peluqueria.find()).map(plain), servicios: SERVICIOS, reserva_estados: ESTADOS_RESERVA.map(([value, label]) => ({ value, label })) });

const barberoEditarReserva = async (req, res) => {
  const reserva = await Reserva.findOne({ _id: req.params.id, peluquero: req.usuario._id }).populate('peluquero peluqueria');
  if (!reserva) return res.redirect('/barbero');
  return res.render('usuarios/usuario_editar_reserva', { layout: 'layouts/dashboard', title: 'Modificar cita', error: req.query.error || '', backUrl: '/barbero', formAction: `/barbero/citas/${reserva._id}`, reserva: { ...plain(reserva), peluquero: plain(reserva.peluquero) || { activo: true }, peluqueria_id: String(reserva.peluqueria?._id || ''), peluquero_id: String(reserva.peluquero?._id || '') }, servicios: SERVICIOS, peluquerias: (await Peluqueria.find()).map(plain), peluqueros: [plain(req.usuario)] });
};

const barberoActualizarReserva = async (req, res) => {
  const current = await Reserva.findOne({ _id: req.params.id, peluquero: req.usuario._id });
  const servicio = findServicio(req.body.servicio);
  if (!current || !servicio) return res.redirect('/barbero');
  if (!dosHorasAntes(current.fecha.toISOString().slice(0, 10), current.hora)) return res.redirect(`/barbero/citas/${req.params.id}/editar?error=${encodeURIComponent('Los cambios deben hacerse con al menos 2 horas de anticipación.')}`);
  const error = await validarCita({ peluqueria: req.body.peluqueria, peluquero: req.usuario._id, fecha: req.body.fecha, hora: req.body.hora, minutos: servicio.minutos, excluir: current._id });
  if (error) return res.redirect(`/barbero/citas/${req.params.id}/editar?error=${encodeURIComponent(error)}`);
  try {
    await Reserva.findByIdAndUpdate(current._id, { servicio: servicio.nombre, peluqueria: req.body.peluqueria, fecha: new Date(`${req.body.fecha}T00:00:00`), hora: req.body.hora, minutos: servicio.minutos, estado: 'Pendiente', requiere_reprogramacion: false, motivo_reprogramacion: '' }, { runValidators: true });
  } catch (updateError) {
    const message = updateError.code === 11000 ? 'Ese horario ya está ocupado.' : 'No se pudo modificar la cita.';
    return res.redirect(`/barbero/citas/${req.params.id}/editar?error=${encodeURIComponent(message)}`);
  }
  void notificarReserva(current._id, 'modificada');
  return res.redirect('/barbero');
};

const barberoGuardarCita = async (req, res) => {
  const service = findServicio(req.body.servicio);
  if (!service || !esId(req.body.cliente) || !esId(req.body.peluqueria)) return res.redirect('/barbero/nueva-cita');
  const error = await validarCita({ peluqueria: req.body.peluqueria, peluquero: req.usuario._id, fecha: req.body.fecha, hora: req.body.hora, minutos: service.minutos });
  if (error) return res.redirect('/barbero/nueva-cita?error=' + encodeURIComponent(error));
  let reserva;
  try {
    reserva = await Reserva.create({ cliente: req.body.cliente, peluqueria: req.body.peluqueria, peluquero: req.usuario._id, servicio: service.nombre, fecha: new Date(`${req.body.fecha}T00:00:00`), hora: req.body.hora, estado: req.body.estado || 'Pendiente', minutos: service.minutos });
  } catch (creationError) {
    return res.redirect('/barbero/nueva-cita?error=' + encodeURIComponent(creationError.code === 11000 ? 'Ese horario ya está ocupado.' : 'No se pudo crear la cita.'));
  }
  void notificarReserva(reserva._id, 'reservada');
  return res.redirect('/barbero');
};

const barberoEstadoCita = async (req, res) => {
  const reserva = await Reserva.findOne({ _id: req.params.id, peluquero: req.usuario._id });
  if (!reserva) return res.redirect('/barbero');
  if (req.body.estado === 'Cancelada') {
    if (dosHorasAntes(reserva.fecha.toISOString().slice(0, 10), reserva.hora)) {
      await Reserva.findByIdAndUpdate(reserva._id, { estado: 'Cancelada' });
      void notificarReserva(reserva._id, 'cancelada');
    }
  } else if (['Pendiente', 'Confirmada', 'Completada'].includes(req.body.estado)) {
    await Reserva.findByIdAndUpdate(reserva._id, { estado: req.body.estado });
  }
  return res.redirect('/barbero');
};

const barberoPerfil = async (req, res) => {
  const usuario = await Usuario.findById(req.usuario._id).populate('peluqueria_id').select('-password');
  const view = usuarioView(usuario);
  view.peluqueria = plain(usuario.peluqueria_id);
  return res.render('peluqueros/peluquero_perfil', { layout: 'layouts/dashboard', usuario: view, calificaciones: [], promedio: 0, total_calificaciones: 0 });
};

module.exports = {
  agregarCarrito, adminCancelarReserva, adminDashboard, adminEliminarBloqueo, adminEliminarPeluqueria, adminEliminarProducto,
  adminFormularioPeluqueria, adminFormularioPeluquero, adminFormularioProducto, adminFormularioReserva, adminFormularioUsuario,
  adminGuardarHorarios, adminGuardarPeluqueria, adminGuardarPeluquero, adminGuardarProducto, adminGuardarReserva, adminGuardarUsuario,
  adminHorarios, adminPeluquerias, adminPeluqueros, adminProductos, adminReservas, adminSuspenderUsuario, adminUsuarios,
  adminCrearBloqueo, adminIngresos, adminMensajes, ayuda, actualizarCarrito, actualizarPerfil, actualizarReserva, barberoDashboard, barberoEstadoCita,
  barberoActualizarReserva, barberoEditarReserva, barberoGuardarCita, barberoNuevaCita, barberoPerfil, cambiarPassword, cancelarReserva, calificar, confirmarCita, confirmarReserva,
  dashboard, editarReserva, eliminarCarrito, finalizarCompra, login, logout, peluquerias, pedidoExitoso, preConfirmar, perfil, registro,
  reservarCita, restablecerPassword, renderLogin, renderReset, solicitarRecuperacion, servicios, tienda, verCarrito
};

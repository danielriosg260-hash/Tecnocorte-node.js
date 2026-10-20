const transporter = require('../config/email');
const Reserva = require('../models/reserva.model');
const Notificacion = require('../models/notificacion.model');
const { enviarCorreoBonito } = require('../config/emailtemplate');

function fechaSinHora(fecha) {
  const valor = new Date(fecha);
  valor.setHours(0, 0, 0, 0);
  return valor;
}

function momentoReserva(reserva) {
  const fecha = new Date(reserva.fecha);
  const [hora, minutos] = String(reserva.hora).split(':').map(Number);
  fecha.setHours(hora || 0, minutos || 0, 0, 0);
  return fecha;
}

async function enviarRecordatorios() {
  const ahora = new Date();
  const limiteFecha = new Date(ahora);
  limiteFecha.setDate(limiteFecha.getDate() + 7);

  const reservas = await Reserva.find({
    fecha: { $gte: fechaSinHora(ahora), $lte: fechaSinHora(limiteFecha) },
    estado: { $nin: ['Cancelada', 'Completada'] },
    recordatorio_correo_enviado: null,
  }).populate('cliente peluqueria peluquero');

  let enviados = 0;
  for (const reserva of reservas) {
    const cliente = reserva.cliente;
    if (!cliente?.activo || !cliente.email || cliente.aviso_correo === false) continue;

    const momento = momentoReserva(reserva);
    const anticipacion = Math.max(1, Number(cliente.aviso_anticipacion_horas) || 24);
    const diferenciaHoras = (momento.getTime() - ahora.getTime()) / 3600000;
    if (diferenciaHoras < 0 || diferenciaHoras > anticipacion) continue;

    const fechaTexto = momento.toLocaleDateString('es-CO');
    const horaTexto = momento.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const nombrePeluqueria = reserva.peluqueria?.nombre || 'tu peluquería';
    const url = process.env.APP_URL
      ? `${process.env.APP_URL.replace(/\/$/, '')}/editar-reserva/${reserva._id}`
      : null;

    await enviarCorreoBonito(transporter, {
      to: cliente.email,
      subject: 'Recordatorio de tu cita en TecnoCorte',
      title: 'Recordatorio de cita',
      greeting: `Hola ${cliente.nombre},`,
      content: `<p>Te recordamos tu cita de <strong>${reserva.servicio}</strong> el ${fechaTexto} a las ${horaTexto} en ${nombrePeluqueria}.</p>`,
      action: url ? { label: 'Revisar mi cita', url } : null,
      text: `Tienes una cita de ${reserva.servicio} el ${fechaTexto} a las ${horaTexto}.`,
    });

    await Notificacion.create({
      usuario: cliente._id,
      reserva: reserva._id,
      mensaje: `Recordatorio: tienes cita de ${reserva.servicio} el ${fechaTexto} a las ${horaTexto}.`,
    });
    reserva.recordatorio_correo_enviado = ahora;
    await reserva.save();
    enviados += 1;
  }
  return { enviados, revisadas: reservas.length };
}

module.exports = { enviarRecordatorios };

const pad = (n) => String(n).padStart(2, '0');

const esFecha = (value) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const fecha = new Date(value + 'T00:00:00');
  return !Number.isNaN(fecha.getTime()) && claveFecha(fecha) === value;
};

const claveFecha = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
};

const minutosDeHora = (value) => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return -1;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

const fechaLocal = (fecha, hora = '00:00') => {
  if (!esFecha(fecha) || minutosDeHora(hora) < 0) return null;
  const value = new Date(`${claveFecha(fecha) || fecha}T${hora}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

module.exports = { esFecha, claveFecha, minutosDeHora, fechaLocal, inicioDelDiaDate: (fecha) => fecha instanceof Date ? new Date(fecha) : new Date(`${fecha}T00:00:00`) };

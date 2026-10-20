// Utilidades de fechas y horas en formato local ("YYYY-MM-DD" y "HH:MM").
// Evitan el desfase de zona horaria que produce usar toISOString().

/** Convierte un número a texto de dos dígitos ("7" -> "07"). */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Indica si el valor es una fecha válida.
 * Acepta un objeto Date válido o una cadena exacta "YYYY-MM-DD"
 * (rechaza días inexistentes como "2026-02-30").
 * @param {*} value Valor a comprobar.
 * @returns {boolean}
 */
const esFecha = (value) => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const fecha = new Date(value + 'T00:00:00');
  return !Number.isNaN(fecha.getTime()) && claveFecha(fecha) === value;
};

/**
 * Devuelve la clave "YYYY-MM-DD" de una fecha usando la zona horaria local.
 * @param {Date|string} valor Fecha o cadena interpretable por Date.
 * @returns {string} Cadena vacía si la fecha no es válida.
 */
const claveFecha = (valor) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
};

/**
 * Convierte una hora "HH:MM" en minutos desde medianoche.
 * @param {string} value Hora en formato 24h.
 * @returns {number} Minutos totales, o -1 si el formato no es válido.
 */
const minutosDeHora = (value) => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return -1;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Crea un objeto Date local combinando fecha y hora, sin desfases de UTC.
 * @param {Date|string} fecha Día en formato "YYYY-MM-DD" o Date.
 * @param {string} hora Hora "HH:MM"; por defecto medianoche.
 * @returns {Date|null} null si la fecha u hora no son válidas.
 */
const fechaLocal = (fecha, hora = '00:00') => {
  if (!esFecha(fecha) || minutosDeHora(hora) < 0) return null;
  const value = new Date(`${claveFecha(fecha) || fecha}T${hora}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
};

module.exports = { esFecha, claveFecha, minutosDeHora, fechaLocal, inicioDelDiaDate: (fecha) => fecha instanceof Date ? new Date(fecha) : new Date(`${fecha}T00:00:00`) };

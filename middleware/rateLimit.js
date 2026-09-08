const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const rateLimitLogin = (req, res, next) => {
  const email = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : typeof req.body?.user === 'string'
      ? req.body.user.trim().toLowerCase()
      : '';
  const key = `${req.ip}:${email}`;
  const now = Date.now();
  const current = (attempts.get(key) || []).filter((time) => time > now - WINDOW_MS);

  if (current.length >= MAX_ATTEMPTS) {
    res.set('Retry-After', String(Math.ceil((current[0] + WINDOW_MS - now) / 1000)));
    return res.status(429).json({ mensaje: 'Demasiados intentos. Inténtalo de nuevo más tarde.' });
  }

  attempts.set(key, [...current, now]);
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) attempts.delete(key);
  });
  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, values] of attempts) {
    const current = values.filter((time) => time > now - WINDOW_MS);
    if (current.length) attempts.set(key, current);
    else attempts.delete(key);
  }
}, WINDOW_MS).unref();

module.exports = rateLimitLogin;

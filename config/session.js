const COOKIE_NAME = 'tc_session';
const CART_COOKIE_NAME = 'tc_cart';

const isProduction = () => process.env.NODE_ENV === 'production';

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: isProduction(),
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const getCookie = (req, name) => {
  const header = req.headers.cookie;
  if (!header) return null;
  const value = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!value) return null;
  try {
    return decodeURIComponent(value.slice(name.length + 1));
  } catch {
    return null;
  }
};

const getSessionToken = (req) => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7).trim();
    if (token) return token;
  }
  return getCookie(req, COOKIE_NAME);
};

const setSessionCookie = (res, token) => res.cookie(COOKIE_NAME, token, sessionCookieOptions);

const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, {
  httpOnly: true,
  sameSite: 'strict',
  secure: isProduction(),
  path: '/'
});

const readCart = (req) => {
  const value = getCookie(req, CART_COOKIE_NAME);
  if (!value) return [];
  try {
    const cart = JSON.parse(value);
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
};

const writeCart = (res, cart) => res.cookie(CART_COOKIE_NAME, JSON.stringify(cart), {
  httpOnly: true,
  sameSite: 'strict',
  secure: isProduction(),
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000
});

module.exports = {
  clearSessionCookie,
  getCookie,
  getSessionToken,
  readCart,
  setSessionCookie,
  writeCart
};

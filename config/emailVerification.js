const crypto = require('crypto');
const transporter = require('./email');
const { enviarCorreoBonito } = require('./emailTemplate');

const crearCodigo = () => String(crypto.randomInt(100000, 1000000));
const hashCodigo = (codigo) => crypto.createHash('sha256').update(String(codigo)).digest('hex');

const guardarCodigo = async (usuario) => {
  const codigo = crearCodigo();
  usuario.email_verificacion_token = hashCodigo(codigo);
  usuario.email_verificacion_expira = new Date(Date.now() + 15 * 60 * 1000);
  await usuario.save();
  return codigo;
};

const enviarCodigo = (usuario, codigo) => enviarCorreoBonito(transporter, {
  to: usuario.email,
  subject: 'Verifica tu correo de TecnoCorte',
  title: 'Verifica tu correo',
  preheader: 'Tu código de verificación vence en 15 minutos.',
  greeting: `Hola ${usuario.nombre},`,
  content: `<p>Para activar tu cuenta necesitamos confirmar que este correo te pertenece.</p><div style="margin:26px 0;padding:18px;text-align:center;background:#f3ead6;border:1px solid #d6ad42;border-radius:12px"><span style="display:block;color:#81786b;font-size:12px;letter-spacing:2px;font-weight:700">CÓDIGO DE VERIFICACIÓN</span><strong style="display:block;margin-top:8px;color:#6d5314;font-size:34px;letter-spacing:8px">${codigo}</strong></div><p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>`,
  text: `Tu código de verificación de TecnoCorte es ${codigo}. Vence en 15 minutos.`
});

const verificarCodigo = (usuario, codigo) => Boolean(
  usuario && usuario.email_verificacion_token && usuario.email_verificacion_expira > new Date() &&
  crypto.timingSafeEqual(Buffer.from(usuario.email_verificacion_token), Buffer.from(hashCodigo(codigo)))
);

module.exports = { guardarCodigo, enviarCodigo, verificarCodigo };

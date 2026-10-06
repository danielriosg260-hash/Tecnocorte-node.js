const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'public', 'images', 'Logo.png');
const logoCid = 'tecnocorte-logo';

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const baseUrl = () => String(process.env.APP_URL || '').replace(/\/$/, '');

const crearCorreo = ({ title, preheader = '', greeting = '', content = '', action = null, text = '' }) => {
  const logo = fs.existsSync(logoPath) ? `cid:${logoCid}` : `${baseUrl()}/images/Logo.png`;
  const actionHtml = action?.url ? `<p style="margin:28px 0 8px;text-align:center"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#d6ad42;color:#241a00;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700">${escapeHtml(action.label || 'Abrir TecnoCorte')}</a></p>` : '';
  const actionText = action?.url ? `\n\n${action.label || 'Abrir TecnoCorte'}: ${action.url}` : '';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f4f1eb;color:#24211d;font-family:Arial,Helvetica,sans-serif"><span style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</span><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1eb;padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fffdf9;border:1px solid #e5dccb;border-radius:18px;overflow:hidden"><tr><td style="background:#171512;padding:25px 30px;text-align:center"><img src="${logo}" width="74" height="74" alt="TecnoCorte" style="display:inline-block;width:74px;height:74px;object-fit:contain;border-radius:14px"><div style="margin-top:12px;color:#d6ad42;font-size:12px;letter-spacing:3px;font-weight:700">TECNOCORTE</div></td></tr><tr><td style="padding:34px 32px"><h1 style="margin:0 0 18px;color:#6d5314;font-size:26px;line-height:1.2">${escapeHtml(title)}</h1>${greeting ? `<p style="font-size:17px;margin:0 0 18px">${escapeHtml(greeting)}</p>` : ''}<div style="font-size:15px;line-height:1.7;color:#514b42">${content}</div>${actionHtml}</td></tr><tr><td style="border-top:1px solid #eee5d7;padding:20px 32px;text-align:center;color:#81786b;font-size:12px;line-height:1.6">TecnoCorte · Cuidado, estilo y precisión<br>Este mensaje fue enviado automáticamente. No respondas a este correo.</td></tr></table></td></tr></table></body></html>`;
  return {
    html,
    text: [greeting, text, actionText].filter(Boolean).join('\n\n'),
    ...(fs.existsSync(logoPath) ? { attachments: [{ filename: 'Logo.png', path: logoPath, cid: logoCid }] } : {})
  };
};

const enviarCorreoBonito = (transporter, options) => transporter.sendMail({
  from: `TecnoCorte <${process.env.EMAIL_USER}>`,
  to: options.to,
  subject: options.subject,
  ...crearCorreo(options)
});

module.exports = { crearCorreo, enviarCorreoBonito, escapeHtml };

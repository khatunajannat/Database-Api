import nodemailer from 'nodemailer';

// Everything reads process.env when it is CALLED (not when this file is imported),
// because dotenv.config() in index.js runs after the imports.
//
// .env settings:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   (required to send emails)
//   MAIL_FROM        e.g.  Admito <you@gmail.com>   (optional, defaults to SMTP_USER)
//   FRONTEND_URL     e.g.  http://localhost:5173    (used for the button link in emails)
//   SMTP_SECURE      "true" only if your provider says so (default: true for port 465)
//   MAIL_ENABLED     set to "false" to switch emails off completely

const env = () => process.env;

export const mailEnabled = () =>
  env().MAIL_ENABLED !== 'false' && !!(env().SMTP_HOST && env().SMTP_USER && env().SMTP_PASS);

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(env().SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: env().SMTP_HOST,
    port,
    secure: env().SMTP_SECURE ? env().SMTP_SECURE === 'true' : port === 465,
    auth: { user: env().SMTP_USER, pass: env().SMTP_PASS },
  });
  return transporter;
}

let warned = false;

// Sends one email. Never throws: a mail problem must not break the app.
// Returns true if the mail server accepted it.
export async function sendMail({ to, subject, html, text }) {
  if (!mailEnabled()) {
    if (!warned) {
      console.log('Email is switched off or SMTP_* settings are missing in .env, so emails are skipped.');
      warned = true;
    }
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: env().MAIL_FROM || `Admito <${env().SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error(`Email to ${to} failed:`, err.message);
    return false;
  }
}

// For the test script: checks the SMTP settings (host, port, login)
export async function verifyMailer() {
  if (!mailEnabled()) throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASS must be set in .env');
  await getTransporter().verify();
}

// ---------- email template ----------

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fullUrl = (link) => {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) return link;
  const base = (env().FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}${link.startsWith('/') ? '' : '/'}${link}`;
};

// Builds { subject, html, text } for one notification
export function buildEmail({ name, title, message, link, linkLabel }) {
  const url = fullUrl(link);
  const label = linkLabel || 'View details';
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,';

  const button = url
    ? `<a href="${escapeHtml(url)}" style="display:inline-block;background:#805827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:8px;">${escapeHtml(label)}</a>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#e7e5e4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7e5e4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#1e293b;padding:18px 24px;color:#FFD700;font-size:20px;font-weight:bold;">Admito</td></tr>
        <tr><td style="padding:24px;color:#1e293b;">
          <p style="margin:0 0 12px;font-size:14px;color:#64748b;">${greeting}</p>
          <h1 style="margin:0 0 12px;font-size:18px;line-height:1.4;color:#1e293b;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(message)}</p>
          ${button}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f8fafc;font-size:12px;line-height:1.5;color:#94a3b8;">
          You are receiving this email because you have an Admito account. You can also see this update in the notifications page.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    name ? `Hi ${name},` : 'Hi,',
    '',
    title,
    message,
    url ? `\n${label}: ${url}` : '',
    '\n-- Admito',
  ].join('\n');

  return { subject: title, html, text };
}

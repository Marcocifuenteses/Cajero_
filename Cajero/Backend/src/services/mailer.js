const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

let transporter = null;

function inicializarTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[Mailer] SMTP no configurado. Los correos de notificación están deshabilitados.');
    return;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  transporter.verify((err) => {
    if (err) {
      console.warn('[Mailer] Advertencia SMTP al verificar conexión:', err.message);
    } else {
      console.log('[Mailer] Conexión SMTP verificada con', SMTP_HOST);
    }
  });
}

inicializarTransporter();


// ─── Helpers ────────────────────────────────────────────────────────────────

const formatMonto = (n) =>
  'Q ' + parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const formatFecha = () =>
  new Date().toLocaleString('es-GT', {
    timeZone: 'America/Guatemala',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });


// ─── Layout base del email ───────────────────────────────────────────────────

function layoutBase(titulo, cuerpo) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#ffffff;border-radius:10px;overflow:hidden;
                  box-shadow:0 4px 16px rgba(0,0,0,0.12);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a237e 0%,#283593 100%);
                   padding:32px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🏦</div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;
                     font-weight:700;">Banco ATM Digital</h1>
          <p style="margin:6px 0 0;color:#9fa8da;font-size:13px;">
            Notificación de movimiento
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;">
          ${cuerpo}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8f9fa;padding:20px 40px;
                   border-top:1px solid #e9ecef;text-align:center;">
          <p style="margin:0;color:#adb5bd;font-size:12px;line-height:1.6;">
            Correo generado automáticamente — no responder.<br>
            <strong style="color:#868e96;">¿No reconoces esta operación?</strong>
            Contacta al banco de inmediato.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}


// ─── Fila de detalle reutilizable ────────────────────────────────────────────

function fila(etiqueta, valor) {
  return `
  <tr>
    <td style="padding:10px 0;color:#6c757d;font-size:14px;
               border-bottom:1px solid #f1f3f5;width:45%;">${etiqueta}</td>
    <td style="padding:10px 0;color:#212529;font-size:14px;
               border-bottom:1px solid #f1f3f5;font-weight:600;
               text-align:right;">${valor}</td>
  </tr>`;
}


// ─── Templates ───────────────────────────────────────────────────────────────

function htmlRetiro({ nombre, cuenta_id, monto, saldo_nuevo }) {
  const cuerpo = `
    <p style="margin:0 0 6px;color:#6c757d;font-size:14px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#212529;font-size:20px;">
      ${nombre || 'estimado cliente'}
    </h2>

    <!-- Badge -->
    <div style="display:inline-block;background:#fff3e0;color:#e65100;
                border:1px solid #ffcc80;border-radius:20px;
                padding:6px 16px;font-size:13px;font-weight:700;
                margin-bottom:24px;">
      💸 Retiro realizado
    </div>

    <!-- Monto destacado -->
    <div style="background:#fff8f0;border-left:4px solid #ff8f00;
                border-radius:6px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;color:#6c757d;font-size:12px;text-transform:uppercase;
                letter-spacing:1px;">Monto retirado</p>
      <p style="margin:0;color:#e65100;font-size:32px;font-weight:700;">
        ${formatMonto(monto)}
      </p>
    </div>

    <!-- Detalles -->
    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Cuenta', `#${cuenta_id}`)}
      ${fila('Saldo anterior', formatMonto(parseFloat(saldo_nuevo) + parseFloat(monto)))}
      ${fila('Saldo actual', formatMonto(saldo_nuevo))}
      ${fila('Fecha y hora', formatFecha())}
    </table>
  `;
  return layoutBase('Retiro realizado', cuerpo);
}


function htmlTransferenciaEnviada({
  nombre, nombre_destino,
  numero_cuenta_origen, numero_cuenta_destino,
  monto, saldo_nuevo
}) {
  const cuentaOrigenLabel = numero_cuenta_origen || 'N/D';
  const cuentaDestinoLabel = numero_cuenta_destino || 'N/D';

  const cuerpo = `
    <p style="margin:0 0 6px;color:#6c757d;font-size:14px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#212529;font-size:20px;">
      ${nombre || 'estimado cliente'}
    </h2>

    <div style="display:inline-block;background:#fff3e0;color:#e65100;
                border:1px solid #ffcc80;border-radius:20px;
                padding:6px 16px;font-size:13px;font-weight:700;
                margin-bottom:24px;">
      🔁 Transferencia enviada
    </div>

    <div style="background:#fff8f0;border-left:4px solid #ff8f00;
                border-radius:6px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;color:#6c757d;font-size:12px;text-transform:uppercase;
                letter-spacing:1px;">Monto transferido</p>
      <p style="margin:0;color:#e65100;font-size:32px;font-weight:700;">
        ${formatMonto(monto)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Remitente', nombre || 'N/D')}
      ${fila('No. cuenta origen', cuentaOrigenLabel)}
      ${fila('Beneficiario', nombre_destino || 'N/D')}
      ${fila('No. cuenta destino', cuentaDestinoLabel)}
      ${fila('Saldo actual', formatMonto(saldo_nuevo))}
      ${fila('Fecha y hora', formatFecha())}
    </table>
  `;
  return layoutBase('Transferencia enviada', cuerpo);
}


function htmlTransferenciaRecibida({
  nombre, nombre_origen,
  numero_cuenta_origen, numero_cuenta_destino,
  monto, saldo_nuevo
}) {
  const cuentaOrigenLabel = numero_cuenta_origen || 'N/D';
  const cuentaDestinoLabel = numero_cuenta_destino || 'N/D';

  const cuerpo = `
    <p style="margin:0 0 6px;color:#6c757d;font-size:14px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#212529;font-size:20px;">
      ${nombre || 'estimado cliente'}
    </h2>

    <div style="display:inline-block;background:#e8f5e9;color:#2e7d32;
                border:1px solid #a5d6a7;border-radius:20px;
                padding:6px 16px;font-size:13px;font-weight:700;
                margin-bottom:24px;">
      ✅ Transferencia recibida
    </div>

    <div style="background:#f1f8f1;border-left:4px solid #43a047;
                border-radius:6px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;color:#6c757d;font-size:12px;text-transform:uppercase;
                letter-spacing:1px;">Monto recibido</p>
      <p style="margin:0;color:#2e7d32;font-size:32px;font-weight:700;">
        ${formatMonto(monto)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Remitente', nombre_origen || 'N/D')}
      ${fila('No. cuenta origen', cuentaOrigenLabel)}
      ${fila('Beneficiario', nombre || 'N/D')}
      ${fila('No. cuenta destino', cuentaDestinoLabel)}
      ${fila('Saldo actual', formatMonto(saldo_nuevo))}
      ${fila('Fecha y hora', formatFecha())}
    </table>
  `;
  return layoutBase('Transferencia recibida', cuerpo);
}


function htmlOperacionFallida({ nombre, tipo, monto, motivo, saldo_actual }) {
  const cuerpo = `
    <p style="margin:0 0 6px;color:#6c757d;font-size:14px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#212529;font-size:20px;">
      ${nombre || 'estimado cliente'}
    </h2>

    <div style="display:inline-block;background:#fdecea;color:#c62828;
                border:1px solid #ef9a9a;border-radius:20px;
                padding:6px 16px;font-size:13px;font-weight:700;
                margin-bottom:24px;">
      ⚠️ Operación fallida
    </div>

    <div style="background:#fdecea;border-left:4px solid #c62828;
                border-radius:6px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;color:#6c757d;font-size:12px;text-transform:uppercase;
                letter-spacing:1px;">Monto solicitado</p>
      <p style="margin:0;color:#c62828;font-size:32px;font-weight:700;">
        ${formatMonto(monto)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Tipo de operación', tipo)}
      ${fila('Motivo del rechazo', `<span style="color:#c62828;font-weight:700;">${motivo}</span>`)}
      ${saldo_actual != null ? fila('Saldo disponible', formatMonto(saldo_actual)) : ''}
      ${fila('Fecha y hora', formatFecha())}
    </table>

    <p style="margin:24px 0 0;color:#6c757d;font-size:13px;line-height:1.6;">
      Si no reconoces este intento de operación, contacta al banco de inmediato.
    </p>
  `;
  return layoutBase('Operación fallida', cuerpo);
}


// ─── Funciones públicas de notificación ─────────────────────────────────────

async function enviar({ to, subject, html, text }) {
  if (!transporter) {
    console.warn(`[Mailer] Sin transporter — correo no enviado a ${to}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"Banco ATM Digital" <${FROM_EMAIL}>`,
    to,
    subject,
    text: text || subject,
    html
  });

  console.log(`[Mailer] Correo enviado a ${to} — messageId: ${info.messageId}`);
  return info;
}


async function notificarRetiro(email, nombre, datos) {
  return enviar({
    to: email,
    subject: `Retiro de ${formatMonto(datos.monto)} realizado en tu cuenta`,
    html: htmlRetiro({ nombre, ...datos }),
    text: `Hola ${nombre || 'cliente'}, se realizó un retiro de ${formatMonto(datos.monto)} de la cuenta #${datos.cuenta_id}. Saldo actual: ${formatMonto(datos.saldo_nuevo)}.`
  });
}


async function notificarTransferenciaEnviada(email, nombre, datos) {
  const nc_origen  = datos.numero_cuenta_origen  || '';
  const nc_destino = datos.numero_cuenta_destino || '';
  return enviar({
    to: email,
    subject: `Transferiste ${formatMonto(datos.monto)} desde tu cuenta ${nc_origen}`,
    html: htmlTransferenciaEnviada({ nombre, ...datos }),
    text: `Hola ${nombre || 'cliente'}, transferiste ${formatMonto(datos.monto)} desde la cuenta ${nc_origen} a ${datos.nombre_destino || 'el destinatario'} (cuenta ${nc_destino}). Saldo actual: ${formatMonto(datos.saldo_nuevo)}.`
  });
}


async function notificarTransferenciaRecibida(email, nombre, datos) {
  const nc_origen  = datos.numero_cuenta_origen  || '';
  const nc_destino = datos.numero_cuenta_destino || '';
  return enviar({
    to: email,
    subject: `Recibiste ${formatMonto(datos.monto)} en tu cuenta ${nc_destino}`,
    html: htmlTransferenciaRecibida({ nombre, ...datos }),
    text: `Hola ${nombre || 'cliente'}, recibiste ${formatMonto(datos.monto)} de ${datos.nombre_origen || 'un remitente'} (cuenta ${nc_origen}) en tu cuenta ${nc_destino}. Saldo actual: ${formatMonto(datos.saldo_nuevo)}.`
  });
}


async function notificarOperacionFallida(email, nombre, datos) {
  return enviar({
    to: email,
    subject: `Operación fallida: ${datos.tipo} de ${formatMonto(datos.monto)}`,
    html: htmlOperacionFallida({ nombre, ...datos }),
    text: `Hola ${nombre || 'cliente'}, tu intento de ${datos.tipo.toLowerCase()} por ${formatMonto(datos.monto)} fue rechazado. Motivo: ${datos.motivo}.`
  });
}


// Mantiene compatibilidad con el endpoint /atm/test-email
async function sendEmail({ to, subject, text, html }) {
  return enviar({ to, subject, text, html });
}


module.exports = {
  sendEmail,
  notificarRetiro,
  notificarTransferenciaEnviada,
  notificarTransferenciaRecibida,
  notificarOperacionFallida
};

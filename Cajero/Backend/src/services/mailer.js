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
<body style="margin:0;padding:0;background:#060d16;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="background:#0c1826;border-radius:14px;overflow:hidden;
                  border:1px solid rgba(34,197,94,0.18);
                  box-shadow:0 0 40px rgba(34,197,94,0.08),0 8px 32px rgba(0,0,0,0.6);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(160deg,#040e1c 0%,#071828 100%);
                   padding:32px 40px;text-align:center;
                   border-bottom:1px solid rgba(34,197,94,0.2);">
          <!-- Logo mark -->
          <div style="display:inline-block;background:rgba(34,197,94,0.1);
                      border:1px solid rgba(34,197,94,0.3);border-radius:10px;
                      padding:10px 18px;margin-bottom:14px;">
            <span style="font-family:'Courier New',Courier,monospace;
                         font-size:11px;font-weight:700;letter-spacing:4px;
                         color:#22c55e;text-transform:uppercase;">
              &#9632; FINTECH ATM
            </span>
          </div>
          <p style="margin:0;color:rgba(226,245,226,0.4);font-size:12px;letter-spacing:2px;
                    text-transform:uppercase;font-family:'Courier New',Courier,monospace;">
            Notificación de movimiento
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px 40px;background:#0c1826;">
          ${cuerpo}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#060d16;padding:20px 40px;
                   border-top:1px solid rgba(34,197,94,0.1);text-align:center;">
          <p style="margin:0 0 6px;color:rgba(226,245,226,0.25);font-size:11px;
                    font-family:'Courier New',Courier,monospace;letter-spacing:1px;">
            Correo generado automáticamente — no responder.
          </p>
          <p style="margin:0;color:rgba(226,245,226,0.35);font-size:11px;">
            <span style="color:#f59e0b;">&#9888;</span>
            <strong style="color:rgba(226,245,226,0.5);">¿No reconoces esta operación?</strong>
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
    <td style="padding:11px 0;color:rgba(226,245,226,0.45);font-size:13px;
               border-bottom:1px solid rgba(34,197,94,0.08);width:45%;">
      ${etiqueta}
    </td>
    <td style="padding:11px 0;color:#e2f5e2;font-size:13px;
               border-bottom:1px solid rgba(34,197,94,0.08);font-weight:600;
               text-align:right;font-family:'Courier New',Courier,monospace;">
      ${valor}
    </td>
  </tr>`;
}


// ─── Templates ───────────────────────────────────────────────────────────────

function htmlRetiro({ nombre, cuenta_id, numero_cuenta, monto, saldo_nuevo }) {
  const cuentaLabel = numero_cuenta || `#${cuenta_id}`;
  const cuerpo = `
    <p style="margin:0 0 4px;color:rgba(226,245,226,0.45);font-size:13px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#e2f5e2;font-size:20px;font-weight:700;">
      ${nombre || 'estimado cliente'}
    </h2>

    <!-- Badge -->
    <div style="display:inline-block;background:rgba(245,158,11,0.1);color:#f59e0b;
                border:1px solid rgba(245,158,11,0.3);border-radius:20px;
                padding:6px 16px;font-size:12px;font-weight:700;
                margin-bottom:24px;font-family:'Courier New',Courier,monospace;
                letter-spacing:1px;text-transform:uppercase;">
      &#10148; Retiro realizado
    </div>

    <!-- Monto destacado -->
    <div style="background:rgba(245,158,11,0.06);border-left:3px solid #f59e0b;
                border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 6px;color:rgba(226,245,226,0.4);font-size:11px;
                text-transform:uppercase;letter-spacing:2px;
                font-family:'Courier New',Courier,monospace;">
        Monto retirado
      </p>
      <p style="margin:0;color:#f59e0b;font-size:34px;font-weight:700;
                font-family:'Courier New',Courier,monospace;letter-spacing:1px;">
        ${formatMonto(monto)}
      </p>
    </div>

    <!-- Detalles -->
    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Cuenta', cuentaLabel)}
      ${fila('Saldo anterior', formatMonto(parseFloat(saldo_nuevo) + parseFloat(monto)))}
      ${fila('Saldo actual', `<span style="color:#22c55e;">${formatMonto(saldo_nuevo)}</span>`)}
      ${fila('Fecha y hora', formatFecha())}
    </table>
  `;
  return layoutBase('Retiro realizado — Fintech ATM', cuerpo);
}


function htmlTransferenciaEnviada({
  nombre, nombre_destino,
  numero_cuenta_origen, numero_cuenta_destino,
  monto, saldo_nuevo
}) {
  const cuentaOrigenLabel  = numero_cuenta_origen  || 'N/D';
  const cuentaDestinoLabel = numero_cuenta_destino || 'N/D';

  const cuerpo = `
    <p style="margin:0 0 4px;color:rgba(226,245,226,0.45);font-size:13px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#e2f5e2;font-size:20px;font-weight:700;">
      ${nombre || 'estimado cliente'}
    </h2>

    <div style="display:inline-block;background:rgba(59,130,246,0.1);color:#60a5fa;
                border:1px solid rgba(59,130,246,0.3);border-radius:20px;
                padding:6px 16px;font-size:12px;font-weight:700;
                margin-bottom:24px;font-family:'Courier New',Courier,monospace;
                letter-spacing:1px;text-transform:uppercase;">
      &#10148; Transferencia enviada
    </div>

    <div style="background:rgba(59,130,246,0.06);border-left:3px solid #3b82f6;
                border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 6px;color:rgba(226,245,226,0.4);font-size:11px;
                text-transform:uppercase;letter-spacing:2px;
                font-family:'Courier New',Courier,monospace;">
        Monto transferido
      </p>
      <p style="margin:0;color:#60a5fa;font-size:34px;font-weight:700;
                font-family:'Courier New',Courier,monospace;letter-spacing:1px;">
        ${formatMonto(monto)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Remitente', nombre || 'N/D')}
      ${fila('No. cuenta origen', cuentaOrigenLabel)}
      ${fila('Beneficiario', nombre_destino || 'N/D')}
      ${fila('No. cuenta destino', cuentaDestinoLabel)}
      ${fila('Saldo actual', `<span style="color:#22c55e;">${formatMonto(saldo_nuevo)}</span>`)}
      ${fila('Fecha y hora', formatFecha())}
    </table>
  `;
  return layoutBase('Transferencia enviada — Fintech ATM', cuerpo);
}


function htmlTransferenciaRecibida({
  nombre, nombre_origen,
  numero_cuenta_origen, numero_cuenta_destino,
  monto, saldo_nuevo
}) {
  const cuentaOrigenLabel  = numero_cuenta_origen  || 'N/D';
  const cuentaDestinoLabel = numero_cuenta_destino || 'N/D';

  const cuerpo = `
    <p style="margin:0 0 4px;color:rgba(226,245,226,0.45);font-size:13px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#e2f5e2;font-size:20px;font-weight:700;">
      ${nombre || 'estimado cliente'}
    </h2>

    <div style="display:inline-block;background:rgba(34,197,94,0.1);color:#22c55e;
                border:1px solid rgba(34,197,94,0.3);border-radius:20px;
                padding:6px 16px;font-size:12px;font-weight:700;
                margin-bottom:24px;font-family:'Courier New',Courier,monospace;
                letter-spacing:1px;text-transform:uppercase;">
      &#10004; Transferencia recibida
    </div>

    <div style="background:rgba(34,197,94,0.06);border-left:3px solid #22c55e;
                border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 6px;color:rgba(226,245,226,0.4);font-size:11px;
                text-transform:uppercase;letter-spacing:2px;
                font-family:'Courier New',Courier,monospace;">
        Monto recibido
      </p>
      <p style="margin:0;color:#22c55e;font-size:34px;font-weight:700;
                font-family:'Courier New',Courier,monospace;letter-spacing:1px;">
        ${formatMonto(monto)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Remitente', nombre_origen || 'N/D')}
      ${fila('No. cuenta origen', cuentaOrigenLabel)}
      ${fila('Beneficiario', nombre || 'N/D')}
      ${fila('No. cuenta destino', cuentaDestinoLabel)}
      ${fila('Saldo actual', `<span style="color:#22c55e;">${formatMonto(saldo_nuevo)}</span>`)}
      ${fila('Fecha y hora', formatFecha())}
    </table>
  `;
  return layoutBase('Transferencia recibida — Fintech ATM', cuerpo);
}


function htmlOperacionFallida({ nombre, tipo, monto, motivo, saldo_actual }) {
  const cuerpo = `
    <p style="margin:0 0 4px;color:rgba(226,245,226,0.45);font-size:13px;">Hola,</p>
    <h2 style="margin:0 0 24px;color:#e2f5e2;font-size:20px;font-weight:700;">
      ${nombre || 'estimado cliente'}
    </h2>

    <div style="display:inline-block;background:rgba(239,68,68,0.1);color:#f87171;
                border:1px solid rgba(239,68,68,0.3);border-radius:20px;
                padding:6px 16px;font-size:12px;font-weight:700;
                margin-bottom:24px;font-family:'Courier New',Courier,monospace;
                letter-spacing:1px;text-transform:uppercase;">
      &#9888; Operación fallida
    </div>

    <div style="background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;
                border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 6px;color:rgba(226,245,226,0.4);font-size:11px;
                text-transform:uppercase;letter-spacing:2px;
                font-family:'Courier New',Courier,monospace;">
        Monto solicitado
      </p>
      <p style="margin:0;color:#f87171;font-size:34px;font-weight:700;
                font-family:'Courier New',Courier,monospace;letter-spacing:1px;">
        ${formatMonto(monto)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Tipo de operación', tipo)}
      ${fila('Motivo del rechazo', `<span style="color:#f87171;font-weight:700;">${motivo}</span>`)}
      ${saldo_actual != null ? fila('Saldo disponible', formatMonto(saldo_actual)) : ''}
      ${fila('Fecha y hora', formatFecha())}
    </table>

    <p style="margin:24px 0 0;color:rgba(226,245,226,0.4);font-size:12px;line-height:1.6;
              font-family:'Courier New',Courier,monospace;">
      Si no reconoces este intento de operación, contacta al banco de inmediato.
    </p>
  `;
  return layoutBase('Operación fallida — Fintech ATM', cuerpo);
}


// ─── Funciones públicas de notificación ─────────────────────────────────────

async function enviar({ to, subject, html, text }) {
  if (!transporter) {
    console.warn(`[Mailer] Sin transporter — correo no enviado a ${to}`);
    return;
  }

  const info = await transporter.sendMail({
    from: `"Fintech ATM" <${FROM_EMAIL}>`,
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

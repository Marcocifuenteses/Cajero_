const fs   = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', '..', 'actividad.log');

function formatFecha() {
  return new Date().toLocaleString('es-GT', {
    timeZone:  'America/Guatemala',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function log(accion, detalles = {}) {
  try {
    const partes = Object.entries(detalles)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    const linea = `[${formatFecha()}] ${accion}${partes ? ' | ' + partes : ''}\n`;
    fs.appendFileSync(LOG_PATH, linea, 'utf8');
  } catch (e) {
    console.warn('[Logger] Error escribiendo log:', e.message);
  }
}

module.exports = { log, LOG_PATH };

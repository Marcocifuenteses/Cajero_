const crypto  = require('crypto');
const db      = require('../db/db');
const service = require('../services/atm.service');
const mailer  = require('../services/mailer');
const logger  = require('../services/logger');
const tracker = require('../services/session-tracker');

// In-memory stores para verificación admin (sin BD)
const codigosPendientes = new Map(); // email -> { codigo, expiresAt }
const tokensActivos     = new Map(); // token -> { email, expiresAt }

exports.login = async (req, res) => {
  try {
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    res.json(await service.login({ ...req.body, ip_cliente: ip }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.validateCard = async (req, res) => {
  try {
    res.json(await service.validateTarjeta(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.getCuentas = async (req, res) => {
  try {
    const requestedId = parseInt(req.params.usuario_id, 10);

    // Verificar que la sesión pertenece al usuario solicitado
    if (isNaN(requestedId) || req.sesion.usuario_id !== requestedId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    res.json(await service.getCuentas(requestedId, req.sesion.tarjeta_id, req.sesion.tipo_tarjeta));
  } catch (e) {
    console.error('Error en getCuentas:', e);
    res.status(500).json({ error: 'Error al obtener cuentas' });
  }
};

exports.cambiarPin = async (req, res) => {
  try {
    const tarjeta_id = req.sesion.tarjeta_id;
    res.json(await service.cambiarPin({ tarjeta_id, ...req.body }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.retiro = async (req, res) => {
  try {
    res.json(await service.retiro(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.historial = async (req, res) => {
  try {
    const cuenta_id = parseInt(req.params.cuenta_id, 10);
    if (isNaN(cuenta_id)) {
      return res.status(400).json({ error: 'ID de cuenta inválido' });
    }
    const page = req.query.page || '1';
    res.json(await service.historial(cuenta_id, req.sesion.usuario_id, page));
  } catch (e) {
    console.error('Error en historial:', e);
    res.status(400).json({ error: e.message });
  }
};

exports.transferencia = async (req, res) => {
  try {
    res.json(await service.transferencia(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.buscarCuenta = async (req, res) => {
  try {
    const telefono = req.query.telefono;
    if (!telefono) {
      return res.status(400).json({ error: 'Parámetro "telefono" requerido' });
    }
    res.json(await service.buscarCuentaPorTelefono(telefono));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.solicitarCodigoAdmin = async (req, res) => {
  const { email, nombre, telefono } = req.body || {};
  if (!email || !nombre || !telefono) {
    return res.status(400).json({ error: 'Completa todos los campos' });
  }

  let tarjeta;
  try {
    tarjeta = await service.buscarTarjetaBloqueadaPorEmail(email);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  codigosPendientes.set(email.toLowerCase(), {
    codigo,
    expiresAt: Date.now() + 10 * 60 * 1000,
    numero_tarjeta: tarjeta.numero_tarjeta,
    tarjeta_id: tarjeta.id,
  });

  try {
    await mailer.enviarCodigoAdmin(email.trim(), nombre.trim(), codigo);
    logger.log('ADMIN_CODIGO_SOLICITADO', { email: email.trim(), nombre: nombre.trim(), telefono: telefono.trim() });
    return res.json({ ok: true });
  } catch (e) {
    codigosPendientes.delete(email.toLowerCase());
    return res.status(500).json({ error: 'Error al enviar el correo' });
  }
};

exports.verificarCodigoAdmin = (req, res) => {
  const { email, codigo } = req.body || {};
  if (!email || !codigo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const key   = email.toLowerCase();
  const entry = codigosPendientes.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    codigosPendientes.delete(key);
    return res.status(400).json({ error: 'Código expirado. Solicita uno nuevo.' });
  }

  if (entry.codigo !== codigo.trim()) {
    return res.status(400).json({ error: 'Código incorrecto' });
  }

  const { numero_tarjeta, tarjeta_id } = entry;
  codigosPendientes.delete(key);

  const token = crypto.randomBytes(32).toString('hex');
  tokensActivos.set(token, { email: key, expiresAt: Date.now() + 15 * 60 * 1000, numero_tarjeta, tarjeta_id });

  return res.json({ ok: true, session_token: token, numero_tarjeta });
};

exports.desbloquearTarjeta = async (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.body?.admin_secret;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const token = req.body?.session_token;
  if (!token) {
    return res.status(403).json({ error: 'Se requiere verificación previa' });
  }

  const tokenEntry = tokensActivos.get(token);
  if (!tokenEntry || Date.now() > tokenEntry.expiresAt) {
    tokensActivos.delete(token);
    return res.status(403).json({ error: 'Sesión expirada. Verifica nuevamente.' });
  }

  try {
    const resultado = await service.desbloquearTarjeta({ numero_tarjeta: tokenEntry.numero_tarjeta });
    tokensActivos.delete(token);
    res.json(resultado);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.logout = async (req, res) => {
  const sesion_id = req.headers['sesion-id'] || req.body?.sesion_id;
  if (sesion_id) {
    await db.query(
      `UPDATE sesiones_atm SET activa = false WHERE id = $1`,
      [sesion_id]
    ).catch(() => {});
    tracker.remove(sesion_id);
    logger.log('LOGOUT', { sesion: sesion_id });
  }
  res.json({ ok: true });
};

exports.testEmail = async (req, res) => {
  const to = req.query.to || process.env.ADMIN_EMAIL;
  if (!to) return res.status(400).json({ error: 'Falta parámetro "to" o ADMIN_EMAIL no configurado' });

  try {
    const info = await mailer.sendEmail({
      to,
      subject: 'Correo de prueba - ATM',
      text: 'Este es un correo de prueba enviado desde el servicio ATM.'
    });
    return res.json({ ok: true, to, info });
  } catch (e) {
    console.error('Error enviando correo de prueba:', e);
    return res.status(500).json({ error: 'Error al enviar correo' });
  }
};

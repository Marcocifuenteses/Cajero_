const service = require('../services/atm.service');
const mailer = require('../services/mailer');

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

    res.json(await service.getCuentas(requestedId));
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

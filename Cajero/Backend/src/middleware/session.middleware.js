const db      = require('../db/db');
const tracker = require('../services/session-tracker');

const SESSION_TIMEOUT_MIN = parseInt(process.env.SESSION_TIMEOUT_MIN || '30', 10);

const validarSesion = async (req, res, next) => {
  const sesion_id = req.headers['sesion-id'];

  if (!sesion_id) {
    return res.status(401).json({ error: 'Sesión requerida' });
  }

  try {
    const result = await db.query(
      `SELECT s.*, t.usuario_id
       FROM sesiones_atm s
       JOIN tarjetas t ON t.id = s.tarjeta_id
       WHERE s.id = $1
         AND s.activa = true
         AND s.fecha_inicio > NOW() - ($2 || ' minutes')::INTERVAL`,
      [sesion_id, SESSION_TIMEOUT_MIN]
    );

    if (result.rows.length === 0) {
      // Marcar la sesión como inactiva si existe pero expiró
      await db.query(
        `UPDATE sesiones_atm SET activa = false
         WHERE id = $1 AND activa = true`,
        [sesion_id]
      ).catch(() => {});
      return res.status(401).json({ error: 'Sesión expirada. Por favor inicia sesión nuevamente.' });
    }

    tracker.touch(sesion_id);
    req.sesion = result.rows[0];
    next();
  } catch (e) {
    console.error('Error validando sesión:', e);
    return res.status(500).json({ error: 'Error interno al validar sesión' });
  }
};

module.exports = validarSesion;
const db = require('../db/db');
const { notificarRetiro, notificarTransferenciaEnviada, notificarTransferenciaRecibida, notificarOperacionFallida } = require('./mailer');

const MAX_INTENTOS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '3', 10);
const ATM_CODIGO = process.env.ATM_CODIGO || 'ATM-001';

// Helpers para mapear campos según el schema real de la BD
const getEmail = (row) =>
  row.email || row.correo || row.mail || row.email_address || null;

const getNombre = (row) => {
  if (!row) return '';
  // Columnas reales de la BD: nombres + apellidos
  const nombres   = row.nombres   || row.nombre   || row.nombre_completo || row.first_name  || '';
  const apellidos = row.apellidos || row.apellido  || row.last_name       || row.primer_nombre || '';
  if (nombres && apellidos) return `${nombres} ${apellidos}`.trim();
  return (nombres || apellidos || row.titular || row.usuario_nombre || '').trim();
};

const getUsuarioId = (row) =>
  row.usuario_id ?? row.usuarioid ?? row.user_id ?? null;

const obtenerInfoUsuario = async (cuentaRow) => {
  const usuarioId = getUsuarioId(cuentaRow);
  if (!usuarioId) return null;
  const res = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [usuarioId]);
  if (res.rows.length === 0) return null;
  return { email: getEmail(res.rows[0]), nombre: getNombre(res.rows[0]) };
};

// Valida que un valor sea un entero positivo
const validarIdEntero = (val, nombre) => {
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) throw new Error(`${nombre} inválido`);
  return n;
};

const validarMonto = (monto) => {
  const n = parseFloat(monto);
  if (isNaN(n) || n <= 0) throw new Error('Monto inválido');
  return n;
};


exports.validateTarjeta = async ({ numero_tarjeta }) => {
  if (!numero_tarjeta || String(numero_tarjeta).trim() === '') {
    throw new Error('Número de tarjeta requerido');
  }

  const result = await db.query(
    `SELECT * FROM tarjetas WHERE numero_tarjeta = $1`,
    [String(numero_tarjeta).trim()]
  );

  if (result.rows.length === 0) throw new Error('Tarjeta no existe');

  const tarjeta = result.rows[0];

  if (tarjeta.bloqueada) throw new Error('Tarjeta bloqueada');

  // Obtener nombre real desde la tabla usuarios
  let ownerName = getNombre(tarjeta);
  if (!ownerName && tarjeta.usuario_id) {
    const userRes = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [tarjeta.usuario_id]);
    if (userRes.rows.length > 0) ownerName = getNombre(userRes.rows[0]);
  }

  return {
    message: 'Tarjeta válida',
    tarjeta_id: tarjeta.id,
    usuario_id: tarjeta.usuario_id,
    owner_name: ownerName
  };
};


exports.login = async ({ numero_tarjeta, pin, ip_cliente }) => {
  if (!numero_tarjeta || !pin) {
    throw new Error('Número de tarjeta y PIN son requeridos');
  }

  const result = await db.query(
    `SELECT * FROM tarjetas WHERE numero_tarjeta = $1`,
    [String(numero_tarjeta).trim()]
  );

  if (result.rows.length === 0) throw new Error('Tarjeta no existe');

  const tarjeta = result.rows[0];

  if (tarjeta.bloqueada) throw new Error('Tarjeta bloqueada');

  if (String(tarjeta.pin) !== String(pin)) {
    const nuevosIntentos = (tarjeta.intentos_fallidos || 0) + 1;
    const debeBloquear = nuevosIntentos >= MAX_INTENTOS;

    await db.query(
      `UPDATE tarjetas
       SET intentos_fallidos = $1, bloqueada = $2
       WHERE id = $3`,
      [nuevosIntentos, debeBloquear, tarjeta.id]
    );

    if (debeBloquear) {
      throw new Error(`Tarjeta bloqueada por ${MAX_INTENTOS} intentos fallidos`);
    }

    const restantes = MAX_INTENTOS - nuevosIntentos;
    throw new Error(`PIN incorrecto. Intentos restantes: ${restantes}`);
  }

  // Login correcto: resetear contador
  await db.query(
    `UPDATE tarjetas SET intentos_fallidos = 0 WHERE id = $1`,
    [tarjeta.id]
  );

  const sesion = await db.query(
    `INSERT INTO sesiones_atm (tarjeta_id, atm_codigo, ip_maquina)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [tarjeta.id, ATM_CODIGO, ip_cliente || 'desconocida']
  );

  // Obtener nombre real desde la tabla usuarios
  let ownerName = getNombre(tarjeta);
  if (!ownerName && tarjeta.usuario_id) {
    const userRes = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [tarjeta.usuario_id]);
    if (userRes.rows.length > 0) ownerName = getNombre(userRes.rows[0]);
  }

  return {
    message: 'Login exitoso',
    tarjeta_id: tarjeta.id,
    usuario_id: tarjeta.usuario_id,
    owner_name: ownerName,
    sesion: sesion.rows[0]
  };
};


exports.cambiarPin = async ({ tarjeta_id, pin_actual, pin_nuevo }) => {
  const tarjetaId = validarIdEntero(tarjeta_id, 'tarjeta_id');
  if (!pin_actual || !pin_nuevo) throw new Error('PIN actual y nuevo son requeridos');
  if (String(pin_nuevo).length < 4) throw new Error('El PIN nuevo debe tener al menos 4 dígitos');

  const result = await db.query(`SELECT * FROM tarjetas WHERE id = $1`, [tarjetaId]);
  if (result.rows.length === 0) throw new Error('Tarjeta no encontrada');

  const tarjeta = result.rows[0];
  if (tarjeta.bloqueada) throw new Error('Tarjeta bloqueada');
  if (String(tarjeta.pin) !== String(pin_actual)) throw new Error('PIN actual incorrecto');

  await db.query(`UPDATE tarjetas SET pin = $1 WHERE id = $2`, [String(pin_nuevo), tarjetaId]);
  return { message: 'PIN actualizado correctamente' };
};


exports.getCuentas = async (usuario_id) => {
  const id = validarIdEntero(usuario_id, 'usuario_id');

  const result = await db.query(
    `SELECT * FROM cuentas WHERE usuario_id = $1`,
    [id]
  );

  return result.rows;
};


const LIMITE_DIARIO = parseFloat(process.env.LIMITE_DIARIO_RETIRO || '2000');
const LIMITE_DIARIO_TRANSFERENCIA = parseFloat(process.env.LIMITE_DIARIO_TRANSFERENCIA || '5000');

exports.retiro = async ({ cuenta_id, monto }) => {
  const cuentaId = validarIdEntero(cuenta_id, 'cuenta_id');
  const montoNum = validarMonto(monto);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const cuentaRes = await client.query(
      `SELECT * FROM cuentas WHERE id = $1 FOR UPDATE`,
      [cuentaId]
    );

    if (cuentaRes.rows.length === 0) throw new Error('Cuenta no existe');

    const cuenta = cuentaRes.rows[0];
    const saldoActual = parseFloat(cuenta.saldo);

    if (saldoActual < montoNum) {
      try {
        const info = await obtenerInfoUsuario(cuenta);
        if (info?.email) await notificarOperacionFallida(info.email, info.nombre, {
          tipo: 'Retiro', monto: montoNum, motivo: 'Saldo insuficiente', saldo_actual: saldoActual
        });
      } catch {}
      throw new Error('Saldo insuficiente');
    }

    // Verificar límite diario de retiros
    const totalHoyRes = await client.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM transacciones
       WHERE cuenta_id = $1
         AND tipo_transaccion = 'retiro'
         AND fecha >= CURRENT_DATE`,
      [cuentaId]
    );
    const totalHoy = parseFloat(totalHoyRes.rows[0].total);
    if (totalHoy + montoNum > LIMITE_DIARIO) {
      const disponible = LIMITE_DIARIO - totalHoy;
      try {
        const info = await obtenerInfoUsuario(cuenta);
        if (info?.email) await notificarOperacionFallida(info.email, info.nombre, {
          tipo: 'Retiro', monto: montoNum,
          motivo: `Límite diario alcanzado. Disponible hoy: Q ${disponible.toFixed(2)}`,
          saldo_actual: saldoActual
        });
      } catch {}
      throw new Error(
        `Límite diario de retiro alcanzado. Disponible hoy: Q ${disponible.toFixed(2)}`
      );
    }

    const nuevoSaldo = saldoActual - montoNum;

    await client.query(
      `UPDATE cuentas SET saldo = $1 WHERE id = $2`,
      [nuevoSaldo, cuentaId]
    );

    const trans = await client.query(
      `INSERT INTO transacciones
       (cuenta_id, tipo_transaccion, monto, saldo_anterior, saldo_nuevo, descripcion, referencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [cuentaId, 'retiro', montoNum, cuenta.saldo, nuevoSaldo, 'Retiro ATM', ATM_CODIGO]
    );

    await client.query(
      `INSERT INTO retiros (cuenta_id, transaccion_id, monto)
       VALUES ($1,$2,$3)`,
      [cuentaId, trans.rows[0].id, montoNum]
    );

    await client.query('COMMIT');

    // Notificación por correo
    try {
      const usuarioId = getUsuarioId(cuenta);
      if (usuarioId) {
        const userRes = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [usuarioId]);
        if (userRes.rows.length > 0) {
          const user = userRes.rows[0];
          const email = getEmail(user);
          if (email) {
            await notificarRetiro(email, getNombre(user), {
              cuenta_id: cuentaId,
              monto: montoNum,
              saldo_nuevo: nuevoSaldo
            });
          }
        }
      }
    } catch (mailErr) {
      console.warn('[Notificación] Error enviando correo de retiro:', mailErr.message);
    }

    return { message: 'Retiro exitoso', saldo_actual: nuevoSaldo };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};


exports.buscarCuentaPorTelefono = async (telefono) => {
  const tel = String(telefono).trim().replace(/\s/g, '');
  if (!tel || tel.length < 7) throw new Error('Ingresa un número de teléfono válido');

  // Intentar columnas comunes de teléfono en orden de probabilidad
  const posiblesColumnas = ['telefono', 'celular', 'phone', 'numero_telefono', 'movil', 'tel'];
  let usuarioRes = { rows: [] };

  for (const col of posiblesColumnas) {
    try {
      const res = await db.query(
        `SELECT * FROM usuarios WHERE ${col} = $1 LIMIT 1`,
        [tel]
      );
      // La columna existe — usamos este resultado aunque esté vacío
      usuarioRes = res;
      break;
    } catch (e) {
      if (e.code === '42703') continue; // columna no existe, probar la siguiente
      throw e;
    }
  }

  if (usuarioRes.rows.length === 0) {
    throw new Error('No se encontró usuario con ese número de teléfono');
  }

  const usuario = usuarioRes.rows[0];

  const cuentasRes = await db.query(
    `SELECT id, tipo_cuenta, numero_cuenta, moneda, activa
     FROM cuentas
     WHERE usuario_id = $1 AND activa = true`,
    [usuario.id]
  );

  if (cuentasRes.rows.length === 0) {
    throw new Error('El usuario no tiene cuentas activas');
  }

  return {
    titular: getNombre(usuario),
    cuentas: cuentasRes.rows.map(c => ({
      id: c.id,
      tipo_cuenta: c.tipo_cuenta || 'Cuenta',
      numero_cuenta: c.numero_cuenta || null,
      moneda: c.moneda || 'GTQ',
      activa: c.activa
    }))
  };
};


exports.historial = async (cuenta_id, usuario_id, page) => {
  const cuentaId = validarIdEntero(cuenta_id, 'cuenta_id');
  const usuarioId = validarIdEntero(usuario_id, 'usuario_id');

  // Verificar que la cuenta pertenece al usuario de la sesión
  const cuentaRes = await db.query(
    `SELECT id FROM cuentas WHERE id = $1 AND usuario_id = $2`,
    [cuentaId, usuarioId]
  );

  if (cuentaRes.rows.length === 0) {
    throw new Error('Cuenta no encontrada o acceso denegado');
  }

  const PAGE_SIZE = 10;
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const offset = (pageNum - 1) * PAGE_SIZE;

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT * FROM transacciones
       WHERE cuenta_id = $1
       ORDER BY fecha DESC
       LIMIT $2 OFFSET $3`,
      [cuentaId, PAGE_SIZE, offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM transacciones WHERE cuenta_id = $1`,
      [cuentaId]
    )
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  return {
    transacciones: dataRes.rows,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / PAGE_SIZE)
  };
};


exports.transferencia = async ({ cuenta_origen, cuenta_destino, monto }) => {
  const origenId = validarIdEntero(cuenta_origen, 'cuenta_origen');
  const destinoId = validarIdEntero(cuenta_destino, 'cuenta_destino');
  const montoNum = validarMonto(monto);

  if (origenId === destinoId) {
    throw new Error('La cuenta origen y destino no pueden ser la misma');
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Bloquear en orden consistente para prevenir deadlocks
    const firstId = Math.min(origenId, destinoId);
    const secondId = Math.max(origenId, destinoId);

    const first = await client.query(
      `SELECT * FROM cuentas WHERE id = $1 FOR UPDATE`,
      [firstId]
    );
    const second = await client.query(
      `SELECT * FROM cuentas WHERE id = $1 FOR UPDATE`,
      [secondId]
    );

    if (first.rows.length === 0 || second.rows.length === 0) {
      throw new Error('Una o ambas cuentas no existen');
    }

    const origenRow = origenId === firstId ? first.rows[0] : second.rows[0];
    const destinoRow = destinoId === firstId ? first.rows[0] : second.rows[0];

    const saldoOrigen = parseFloat(origenRow.saldo);
    if (saldoOrigen < montoNum) {
      try {
        const info = await obtenerInfoUsuario(origenRow);
        if (info?.email) await notificarOperacionFallida(info.email, info.nombre, {
          tipo: 'Transferencia', monto: montoNum,
          motivo: 'Saldo insuficiente', saldo_actual: saldoOrigen
        });
      } catch {}
      throw new Error('Saldo insuficiente');
    }

    // Verificar límite diario de transferencias
    const totalTransfHoyRes = await client.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM transacciones
       WHERE cuenta_id = $1
         AND tipo_transaccion = 'transferencia_enviada'
         AND fecha >= CURRENT_DATE`,
      [origenId]
    );
    const totalTransfHoy = parseFloat(totalTransfHoyRes.rows[0].total);
    if (totalTransfHoy + montoNum > LIMITE_DIARIO_TRANSFERENCIA) {
      const disponible = LIMITE_DIARIO_TRANSFERENCIA - totalTransfHoy;
      try {
        const info = await obtenerInfoUsuario(origenRow);
        if (info?.email) await notificarOperacionFallida(info.email, info.nombre, {
          tipo: 'Transferencia', monto: montoNum,
          motivo: `Límite diario alcanzado. Disponible hoy: Q ${disponible.toFixed(2)}`,
          saldo_actual: saldoOrigen
        });
      } catch {}
      throw new Error(`Límite diario de transferencias alcanzado. Disponible hoy: Q ${disponible.toFixed(2)}`);
    }

    const nuevoOrigen = saldoOrigen - montoNum;
    const nuevoDestino = parseFloat(destinoRow.saldo) + montoNum;

    await client.query(
      `UPDATE cuentas SET saldo = $1 WHERE id = $2`,
      [nuevoOrigen, origenId]
    );
    await client.query(
      `UPDATE cuentas SET saldo = $1 WHERE id = $2`,
      [nuevoDestino, destinoId]
    );

    await client.query(
      `INSERT INTO transferencias (cuenta_origen, cuenta_destino, monto, referencia)
       VALUES ($1,$2,$3,$4)`,
      [origenId, destinoId, montoNum, ATM_CODIGO]
    );

    const ncOrigen  = origenRow.numero_cuenta  || String(origenId);
    const ncDestino = destinoRow.numero_cuenta || String(destinoId);

    await client.query(
      `INSERT INTO transacciones
       (cuenta_id, tipo_transaccion, monto, saldo_anterior, saldo_nuevo, descripcion, referencia)
       VALUES ($1,'transferencia_enviada',$2,$3,$4,$5,$6)`,
      [origenId, montoNum, origenRow.saldo, nuevoOrigen,
       `Transferencia enviada a cuenta ${ncDestino}`, ATM_CODIGO]
    );

    await client.query(
      `INSERT INTO transacciones
       (cuenta_id, tipo_transaccion, monto, saldo_anterior, saldo_nuevo, descripcion, referencia)
       VALUES ($1,'transferencia_recibida',$2,$3,$4,$5,$6)`,
      [destinoId, montoNum, destinoRow.saldo, nuevoDestino,
       `Transferencia recibida de cuenta ${ncOrigen}`, ATM_CODIGO]
    );

    await client.query('COMMIT');

    // Notificaciones a origen y destino
    try {
      const obtenerUsuario = async (usuarioId) => {
        if (!usuarioId) return null;
        const res = await db.query(`SELECT * FROM usuarios WHERE id = $1`, [usuarioId]);
        return res.rows.length > 0 ? res.rows[0] : null;
      };

      const [userOrigen, userDestino] = await Promise.all([
        obtenerUsuario(getUsuarioId(origenRow)),
        obtenerUsuario(getUsuarioId(destinoRow))
      ]);

      const notificaciones = [];

      const nombreOrigen  = getNombre(userOrigen);
      const nombreDestino = getNombre(userDestino);
      const ncOrigen  = origenRow.numero_cuenta  || String(origenId);
      const ncDestino = destinoRow.numero_cuenta || String(destinoId);

      if (userOrigen && getEmail(userOrigen)) {
        notificaciones.push(
          notificarTransferenciaEnviada(getEmail(userOrigen), nombreOrigen, {
            nombre_destino:        nombreDestino,
            numero_cuenta_origen:  ncOrigen,
            numero_cuenta_destino: ncDestino,
            monto:                 montoNum,
            saldo_nuevo:           nuevoOrigen
          })
        );
      }

      if (userDestino && getEmail(userDestino)) {
        notificaciones.push(
          notificarTransferenciaRecibida(getEmail(userDestino), nombreDestino, {
            nombre_origen:         nombreOrigen,
            numero_cuenta_origen:  ncOrigen,
            numero_cuenta_destino: ncDestino,
            monto:                 montoNum,
            saldo_nuevo:           nuevoDestino
          })
        );
      }

      await Promise.all(notificaciones);
    } catch (mailErr) {
      console.warn('[Notificación] Error enviando correos de transferencia:', mailErr.message);
    }

    return { message: 'Transferencia exitosa' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

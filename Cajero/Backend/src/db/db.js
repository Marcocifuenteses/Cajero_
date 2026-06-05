const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    })
  : new Pool({
      user:     process.env.DB_USER,
      host:     process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port:     process.env.DB_PORT,
    });

// Evita que errores de conexión idle derrumben el servidor
pool.on('error', (err) => {
  console.error('PostgreSQL pool error (idle client):', err.message);
});

pool.connect()
  .then(client => {
    console.log('🟢 Conectado a PostgreSQL correctamente');
    client.release();
  })
  .catch(err => console.error('🔴 Error de conexión:', err));

module.exports = pool;

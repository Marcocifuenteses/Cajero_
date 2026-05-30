const { Pool } = require('pg');
require('dotenv').config();

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }  // requerido por Supabase/Render/Railway
    })
  : new Pool({
      user:     process.env.DB_USER,
      host:     process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port:     process.env.DB_PORT,
    });

pool.connect()
  .then(() => console.log('🟢 Conectado a PostgreSQL correctamente'))
  .catch(err => console.error('🔴 Error de conexión:', err));

module.exports = pool;
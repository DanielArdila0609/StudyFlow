const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');

// Conexión a PostgreSQL (Render). Requiere la variable de entorno DATABASE_URL.
// Render Postgres: usa la "Internal Database URL" cuando la app corre en Render
// y la "External Database URL" cuando pruebas desde tu computador.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL (conexión a PostgreSQL).');
}

// PostgreSQL devuelve BIGINT (OID 20) como texto. El frontend espera createdAt
// como número (milisegundos) y lo resta al ordenar, así que lo convertimos.
types.setTypeParser(20, (value) => parseInt(value, 10));

// SSL activo por defecto (Render lo exige para la URL externa).
// Se desactiva solo en localhost o con DATABASE_SSL=false.
const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);
const useSsl = process.env.DATABASE_SSL !== 'false' && !isLocal;

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});

// Atajo para consultas parametrizadas: query('SELECT ... WHERE id = $1', [id])
const query = (text, params) => pool.query(text, params);

async function verifyPostgresConnection() {
  const { rows } = await query('SELECT current_database() AS db');
  console.log(`🐘 PostgreSQL conectado (base de datos: ${rows[0].db})`);
}

// Crea las tablas si no existen (schema.sql es idempotente).
async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Esquema de PostgreSQL verificado');
}

module.exports = { pool, query, verifyPostgresConnection, initSchema };
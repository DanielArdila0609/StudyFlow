// Ejecuta A MANO un archivo de database/migrations (nunca se llama desde server.js).
// Uso:  node database/run-migration.js 001_users_relations.sql --confirmar
// Sin --confirmar solo muestra qué se ejecutaría. Si algo falla, hace ROLLBACK.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function main() {
  const [archivo, flag] = process.argv.slice(2);
  if (!archivo || !/^[\w.-]+\.sql$/.test(archivo)) {
    console.error('Uso: node database/run-migration.js <archivo.sql> --confirmar');
    process.exitCode = 1;
    return;
  }
  const ruta = path.join(__dirname, 'migrations', archivo);
  if (!fs.existsSync(ruta)) {
    console.error(`No existe database/migrations/${archivo}`);
    process.exitCode = 1;
    return;
  }
  if (flag !== '--confirmar') {
    console.log(`Se ejecutaría database/migrations/${archivo}. Agrega --confirmar para aplicarla.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(fs.readFileSync(ruta, 'utf8'));
    console.log(`✅ Migración aplicada: ${archivo}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`❌ Migración revertida (no se cambió nada): ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
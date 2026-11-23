const bcrypt = require('bcryptjs');
const { query } = require('../database/db');
const { esUuid } = require('./materia.model');

// Costo de bcrypt: 10 es seguro y no ahoga el CPU gratuito de Render.
const SALT_ROUNDS = 10;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72; // bcrypt ignora lo que pase de 72 bytes

const normalizarEmail = (email) => String(email ?? '').trim().toLowerCase();

// Devuelve la lista de errores de una contraseña nueva (vacía = válida).
function validarPassword(password) {
  const errors = [];
  const valor = typeof password === 'string' ? password : '';
  if (valor.length < PASSWORD_MIN) errors.push(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
  if (Buffer.byteLength(valor, 'utf8') > PASSWORD_MAX_BYTES) errors.push('La contraseña es demasiado larga (máximo 72 bytes).');
  return errors;
}

// Valida el body de registro y devuelve solo los campos permitidos.
// La contraseña NO se recorta (los espacios cuentan).
function validarUsuario(body = {}) {
  const errors = [];
  const name = String(body.name ?? '').trim();
  const email = normalizarEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length < 1 || name.length > 100) errors.push('El nombre es obligatorio (máximo 100 caracteres).');
  if (email.length > 254 || !RE_EMAIL.test(email)) errors.push('El correo no es válido.');
  errors.push(...validarPassword(password));

  return { errors, data: { name, email, password } };
}

// Usuario "público": nunca incluye password_hash.
const filaAUsuario = (fila) => ({
  id: fila.id,
  name: fila.name,
  email: fila.email,
  createdAt: fila.created_at,
});

// Recibe datos ya validados con validarUsuario(). Lanza error con
// code = 'EMAIL_DUPLICADO' si el correo ya existe.
async function crearUsuario({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, normalizarEmail(email), passwordHash]
    );
    return filaAUsuario(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      const duplicado = new Error('Ya existe una cuenta con ese correo.');
      duplicado.code = 'EMAIL_DUPLICADO';
      throw duplicado;
    }
    throw error;
  }
}

async function obtenerUsuarioPorId(id) {
  if (!esUuid(id)) return null;
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? filaAUsuario(rows[0]) : null;
}

async function obtenerUsuarioPorEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [normalizarEmail(email)]);
  return rows[0] ? filaAUsuario(rows[0]) : null;
}

// SOLO para el login (FASE 4.2): incluye passwordHash. No enviar al cliente ni registrar en logs.
async function obtenerCredencialesPorEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [normalizarEmail(email)]);
  return rows[0]
    ? { ...filaAUsuario(rows[0]), passwordHash: rows[0].password_hash }
    : null;
}

async function obtenerCredencialesPorId(id) {
  if (!esUuid(id)) return null;
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0]
    ? { ...filaAUsuario(rows[0]), passwordHash: rows[0].password_hash }
    : null;
}

const verificarPassword = (password, passwordHash) =>
  bcrypt.compare(String(password ?? ''), passwordHash);

// Devuelve true si el usuario existe y se actualizó. Validar el largo antes de llamar.
async function actualizarPassword(id, password) {
  if (!esUuid(id)) return false;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rowCount } = await query(
    'UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1',
    [id, passwordHash]
  );
  return rowCount > 0;
}

module.exports = {
  normalizarEmail,
  validarPassword,
  validarUsuario,
  crearUsuario,
  obtenerUsuarioPorId,
  obtenerUsuarioPorEmail,
  obtenerCredencialesPorEmail,
  obtenerCredencialesPorId,
  verificarPassword,
  actualizarPassword,
};
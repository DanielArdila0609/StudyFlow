const crypto = require('crypto');
const { query } = require('../database/db');

const DURACION_MS = 7 * 24 * 60 * 60 * 1000; // la sesión dura 7 días

// En la base solo se guarda el hash SHA-256 del token, nunca el token.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Crea una sesión y devuelve el token en claro (solo viaja en la cookie HttpOnly).
async function crearSesion(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hashToken(token), new Date(Date.now() + DURACION_MS)]
  );
  return { token };
}

// Devuelve el id del usuario dueño de la sesión vigente, o null.
async function obtenerUserIdPorToken(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 128) return null;
  const { rows } = await query(
    'SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > now()',
    [hashToken(token)]
  );
  return rows[0] ? rows[0].user_id : null;
}

async function eliminarSesion(token) {
  if (typeof token !== 'string' || !token) return;
  await query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}

// Cierra todas las sesiones del usuario menos la actual (p. ej. al cambiar la contraseña).
async function eliminarOtrasSesiones(userId, tokenActual) {
  await query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [userId, hashToken(tokenActual || '')]);
}

// Mantenimiento: borra solo sesiones ya vencidas.
async function limpiarExpiradas() {
  await query('DELETE FROM sessions WHERE expires_at <= now()');
}

module.exports = { DURACION_MS, crearSesion, obtenerUserIdPorToken, eliminarSesion, eliminarOtrasSesiones, limpiarExpiradas };
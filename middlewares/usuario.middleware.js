const { obtenerUserIdPorToken } = require('../models/session.model');

const COOKIE_SESION = 'sf_session';

function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;
  for (const par of cabecera.split(';')) {
    const i = par.indexOf('=');
    if (i < 0 || par.slice(0, i).trim() !== nombre) continue;
    try { return decodeURIComponent(par.slice(i + 1).trim()); } catch (error) { return null; }
  }
  return null;
}

// Identifica al usuario SOLO por la sesión de la cookie HttpOnly.
// Ningún header enviado por el navegador (como x-user-id) se usa como identidad.
module.exports = async function requireUsuario(req, res, next) {
  try {
    const token = leerCookie(req, COOKIE_SESION);
    const userId = await obtenerUserIdPorToken(token);
    if (!userId) return res.status(401).json({ error: 'Tu sesión no es válida o expiró. Inicia sesión.' });
    req.userId = userId;
    req.sessionToken = token;
    next();
  } catch (error) {
    next(error);
  }
};
module.exports.COOKIE_SESION = COOKIE_SESION;
module.exports.leerCookie = leerCookie;
const bcrypt = require('bcryptjs');
const users = require('../models/user.model');
const sessions = require('../models/session.model');
const { COOKIE_SESION, leerCookie } = require('../middlewares/usuario.middleware');

// Hash falso: el login siempre ejecuta bcrypt, exista o no el correo (evita medir tiempos).
const HASH_FALSO = bcrypt.hashSync('contrasena-falsa-studyflow', 10);

// HttpOnly: JavaScript no puede leerla. Strict: no viaja desde otros sitios.
// Secure: solo por HTTPS (en Render lo es; en localhost http se omite).
const opcionesCookie = (req) => ({ httpOnly: true, secure: req.secure, sameSite: 'strict', path: '/' });

async function registrar(req, res, next) {
  try {
    const { errors, data } = users.validarUsuario(req.body ?? {});
    if (errors.length) return res.status(400).json({ errors });
    try {
      const user = await users.crearUsuario(data);
      return res.status(201).json({ user });
    } catch (error) {
      if (error.code === 'EMAIL_DUPLICADO') return res.status(409).json({ error: error.message });
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = users.normalizarEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 254 || password.length > 1000) {
      return res.status(400).json({ error: 'Escribe tu correo y tu contraseña.' });
    }

    const cred = await users.obtenerCredencialesPorEmail(email);
    const coincide = await users.verificarPassword(password, cred ? cred.passwordHash : HASH_FALSO);
    if (!cred || !coincide) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

    // Sesión nueva en cada login (evita fijación de sesión).
    const anterior = leerCookie(req, COOKIE_SESION);
    if (anterior) await sessions.eliminarSesion(anterior);
    await sessions.limpiarExpiradas();
    const { token } = await sessions.crearSesion(cred.id);

    res.cookie(COOKIE_SESION, token, { ...opcionesCookie(req), maxAge: sessions.DURACION_MS });
    const { passwordHash, ...user } = cred;
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await sessions.eliminarSesion(leerCookie(req, COOKIE_SESION));
    res.clearCookie(COOKIE_SESION, opcionesCookie(req));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await users.obtenerUsuarioPorId(req.userId);
    if (!user) return res.status(401).json({ error: 'Tu sesión no es válida o expiró. Inicia sesión.' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function cambiarPassword(req, res, next) {
  try {
    const actual = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const nueva = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const errors = users.validarPassword(nueva);
    if (errors.length) return res.status(400).json({ errors });

    const cred = await users.obtenerCredencialesPorId(req.userId);
    if (!cred || !(await users.verificarPassword(actual, cred.passwordHash))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    await users.actualizarPassword(req.userId, nueva);
    await sessions.eliminarOtrasSesiones(req.userId, req.sessionToken); // cierra las demás sesiones
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { registrar, login, logout, me, cambiarPassword };
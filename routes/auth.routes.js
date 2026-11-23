const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const requireUsuario = require('../middlewares/usuario.middleware');
const { crearLimitador } = require('../middlewares/rate-limit.middleware');

const MIN = 60 * 1000;
const emailDe = (req) => String(req.body?.email ?? '').trim().toLowerCase().slice(0, 254);

const limitarRegistro = crearLimitador({ ventanaMs: 60 * MIN, max: 10, clave: (req) => req.ip, mensaje: 'Demasiados registros desde esta red. Inténtalo más tarde.' });
const limitarLoginIp = crearLimitador({ ventanaMs: 15 * MIN, max: 100, clave: (req) => req.ip, mensaje: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' });
const limitarLoginCuenta = crearLimitador({ ventanaMs: 15 * MIN, max: 10, clave: (req) => `${req.ip}|${emailDe(req)}`, mensaje: 'Demasiados intentos con este correo. Espera unos minutos e inténtalo de nuevo.' });
const limitarPassword = crearLimitador({ ventanaMs: 15 * MIN, max: 10, clave: (req) => req.userId, mensaje: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' });

router.post('/register', limitarRegistro, auth.registrar);
router.post('/login', limitarLoginIp, limitarLoginCuenta, auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireUsuario, auth.me);
router.post('/password', requireUsuario, limitarPassword, auth.cambiarPassword);

module.exports = router;
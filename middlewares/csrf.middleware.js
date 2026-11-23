// Protección CSRF para peticiones que modifican datos (POST, PATCH, PUT, DELETE).
// Defensa en capas junto con la cookie SameSite=Strict:
//   1) Origin (o Referer) debe ser este mismo sitio.
//   2) Debe venir la cabecera personalizada X-Requested-With: StudyFlow
//      (otro sitio no puede enviarla sin pasar por CORS, que no habilitamos).
const SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

function origenDe(req) {
  const origin = req.get('origin');
  if (origin && origin !== 'null') return origin;
  return req.get('referer') || null;
}

module.exports = function protegerCsrf(req, res, next) {
  if (SEGUROS.has(req.method)) return next();
  let mismoSitio = false;
  try {
    const origen = origenDe(req);
    mismoSitio = Boolean(origen) && new URL(origen).host === req.get('host');
  } catch (error) { /* origen mal formado: se rechaza */ }
  if (!mismoSitio || req.get('x-requested-with') !== 'StudyFlow') {
    return res.status(403).json({ error: 'Solicitud no permitida.' });
  }
  next();
};
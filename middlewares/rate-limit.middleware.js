// Limitador de intentos en memoria (sin dependencias). Basta para una sola instancia
// en Render; con varias instancias cada una cuenta por separado.
function crearLimitador({ ventanaMs, max, clave, mensaje }) {
  const intentos = new Map();
  setInterval(() => {
    const ahora = Date.now();
    for (const [k, v] of intentos) if (v.reinicia <= ahora) intentos.delete(k);
  }, ventanaMs).unref();

  return (req, res, next) => {
    const k = clave(req);
    const ahora = Date.now();
    let entrada = intentos.get(k);
    if (!entrada || entrada.reinicia <= ahora) {
      entrada = { n: 0, reinicia: ahora + ventanaMs };
      intentos.set(k, entrada);
    }
    entrada.n += 1;
    if (entrada.n > max) {
      res.set('Retry-After', String(Math.ceil((entrada.reinicia - ahora) / 1000)));
      return res.status(429).json({ error: mensaje });
    }
    next();
  };
}

module.exports = { crearLimitador };
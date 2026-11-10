// TEMPORAL: identifica al usuario con el header "x-user-id".
// Cuando implementes Firebase Auth, aquí verificarás el token
// (admin.auth().verifyIdToken) y asignarás req.userId = decoded.uid.
module.exports = function requireUsuario(req, res, next) {
  const userId = req.header('x-user-id');
  if (!userId || !/^[A-Za-z0-9_-]{3,128}$/.test(userId)) {
    return res.status(401).json({ error: 'Falta el header x-user-id (o no es válido).' });
  }
  req.userId = userId;
  next();
};
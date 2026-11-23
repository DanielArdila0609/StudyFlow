require('dotenv').config();
const path = require('path');
const express = require('express');
const { pool, query, verifyPostgresConnection, initSchema } = require('./database/db');
const requireUsuario = require('./middlewares/usuario.middleware');
const protegerCsrf = require('./middlewares/csrf.middleware');
const authRoutes = require('./routes/auth.routes');
const materiasRoutes = require('./routes/materias.routes');
const tareasRoutes = require('./routes/tareas.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

// Render termina el HTTPS en un proxy: así req.ip y req.secure son los reales.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  next();
});
// El frontend se sirve desde este mismo servidor (mismo origen): no hace falta CORS.
app.use(express.json());

// La API nunca se cachea; las peticiones que modifican datos exigen origen propio.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', protegerCsrf);

// Salud del servidor (sin usuario): comprueba la conexión con PostgreSQL
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'conectado' });
  } catch (error) {
    console.error('Health check falló:', error.message);
    res.status(500).json({ status: 'error', database: 'sin conexión' });
  }
});

// Autenticación (registro, login, logout, perfil): rutas públicas con límites propios
app.use('/api/auth', authRoutes);

// Rutas privadas: requieren sesión válida (cookie HttpOnly); el usuario sale de la sesión
app.use('/api/materias', requireUsuario, materiasRoutes);
app.use('/api/tareas', requireUsuario, tareasRoutes);

// Cualquier ruta /api que no exista responde JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Página inicial: frontend/html/inicio.html
app.get('/', (req, res) => res.redirect('/html/inicio.html'));

// Frontend estático (HTML, CSS, JS y assets). Solo se expone la carpeta frontend/.
app.use(express.static(FRONTEND_DIR));

// 404 para todo lo demás
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejador global de errores
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
  console.error('Error:', error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

async function start() {
  try {
    await verifyPostgresConnection();
    await initSchema();
    const server = app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));

    // Render envía SIGTERM al reiniciar/desplegar: cerramos servidor y conexiones
    process.on('SIGTERM', () => {
      server.close(() => pool.end().finally(() => process.exit(0)));
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar con PostgreSQL:', error.message);
    process.exit(1);
  }
}

start();
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db, verifyFirebaseConnection } = require('./database/firebase');
const requireUsuario = require('./middlewares/usuario.middleware');
const materiasRoutes = require('./routes/materias.routes');
const tareasRoutes = require('./routes/tareas.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Salud del servidor (sin usuario)
app.get('/api/health', async (req, res) => {
  try {
    await db.listCollections();
    res.json({ status: 'ok', firebase: 'conectado' });
  } catch (error) {
    res.status(500).json({ status: 'error', firebase: 'sin conexión' });
  }
});

// Rutas de la API (todas requieren el header x-user-id)
app.use('/api/materias', requireUsuario, materiasRoutes);
app.use('/api/tareas', requireUsuario, tareasRoutes);

// 404 para rutas que no existen
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// Manejador global de errores
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

async function start() {
  try {
    await verifyFirebaseConnection();
    app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ No se pudo conectar a Firebase:', error.message);
    process.exit(1);
  }
}

start();
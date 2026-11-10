const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  throw new Error(`No se encontró la clave de Firebase en: ${keyPath}`);
}

const serviceAccount = require(keyPath);

// Inicializa Firebase de forma segura si no hay ninguna app activa
let app;
if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

async function verifyFirebaseConnection() {
  await db.listCollections();
  console.log(`🔥 Firebase conectado (proyecto: ${serviceAccount.project_id})`);
}

module.exports = { db, verifyFirebaseConnection };
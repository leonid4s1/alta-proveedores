// src/config/firestore.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let appInitialized = false;

function initFirestore() {
  if (appInitialized) return admin.firestore();

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH no está definido en .env');
  }

  // Convertir a ruta absoluta
  const absolutePath = path.join(__dirname, '..', '..', serviceAccountPath);

  // Verificar que existe
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`No se encontró el archivo de credenciales: ${absolutePath}`);
  }

  const serviceAccount = require(absolutePath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  appInitialized = true;

  return admin.firestore();
}

const db = initFirestore();

module.exports = db;

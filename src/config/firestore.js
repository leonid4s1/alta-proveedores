// src/config/firestore.js
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let appInitialized = false;

function loadServiceAccount() {
  // 1) Primero intentamos usar el JSON completo desde la variable de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      console.log('Firestore: usando FIREBASE_SERVICE_ACCOUNT_JSON desde env');
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error('❌ No se pudo parsear FIREBASE_SERVICE_ACCOUNT_JSON');
      throw err;
    }
  }

  // 2) Si NO hay JSON en env, usamos la ruta al archivo (entorno local)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    throw new Error(
      'Debes definir FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en las variables de entorno'
    );
  }

  // Convertir a ruta absoluta
  const absolutePath = path.join(__dirname, '..', '..', serviceAccountPath);

  // Verificar que existe
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`No se encontró el archivo de credenciales: ${absolutePath}`);
  }

  console.log('Firestore: usando archivo de credenciales en', absolutePath);
  // require del JSON local
  return require(absolutePath);
}

function initFirestore() {
  if (appInitialized) return admin.firestore();

  const serviceAccount = loadServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  appInitialized = true;

  return admin.firestore();
}

const db = initFirestore();

module.exports = db;

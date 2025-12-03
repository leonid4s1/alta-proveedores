// src/config/drive.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

function loadServiceAccount() {
  // 1) Primero intentamos usar el JSON completo desde la variable de entorno
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      console.log('Drive: usando FIREBASE_SERVICE_ACCOUNT_JSON desde env');
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

  // Ruta absoluta al JSON del service account
  const absolutePath = path.join(__dirname, '..', '..', serviceAccountPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`No se encontró el archivo de credenciales en: ${absolutePath}`);
  }

  console.log('Drive: usando archivo de credenciales en', absolutePath);
  return require(absolutePath);
}

// Cargamos credenciales (desde env o archivo, según el caso)
const serviceAccount = loadServiceAccount();

// GoogleAuth con credenciales + scope de Drive
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount, // 👈 importante: usamos el objeto, no keyFile
  scopes: ['https://www.googleapis.com/auth/drive'],
});

// Función que devuelve un cliente autenticado de Drive
async function getDriveClient() {
  const authClient = await auth.getClient();
  const drive = google.drive({
    version: 'v3',
    auth: authClient,
  });

  return drive;
}

module.exports = {
  getDriveClient,
};

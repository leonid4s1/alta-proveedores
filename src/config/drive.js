// src/config/drive.js
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH no está definido en .env');
}

// Ruta absoluta al JSON del service account
const absolutePath = path.join(__dirname, '..', '..', serviceAccountPath);

if (!fs.existsSync(absolutePath)) {
  throw new Error(`No se encontró el archivo de credenciales en: ${absolutePath}`);
}

// Configuramos GoogleAuth con el JSON y el scope de Drive
const auth = new google.auth.GoogleAuth({
  keyFile: absolutePath,
  scopes: ['https://www.googleapis.com/auth/drive']
});

// Función que devuelve un cliente autenticado de Drive
async function getDriveClient() {
  const authClient = await auth.getClient();
  const drive = google.drive({
    version: 'v3',
    auth: authClient
  });

  return drive;
}

module.exports = {
  getDriveClient
};

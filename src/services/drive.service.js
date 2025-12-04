// src/services/drive.service.js
const { getDriveClient } = require('../config/drive');
const { Readable } = require('stream');

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID;

async function crearCarpetaProveedor(nombreCarpeta) {
  if (!ROOT_FOLDER_ID) {
    throw new Error('DRIVE_ROOT_FOLDER_ID no está definido en .env');
  }

  const drive = await getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: nombreCarpeta,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [ROOT_FOLDER_ID]
    },
    fields: 'id, name',
    supportsAllDrives: true
  });

  return res.data; // { id, name }
}

async function subirPdfACarpeta(file, folderId) {
  const drive = await getDriveClient();

  // Se convierte el buffer de multer en un stream legible
  const fileStream = Readable.from(file.buffer);

  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [folderId],
      mimeType: 'application/pdf'
    },
    media: {
      mimeType: file.mimetype,
      body: fileStream
    },
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true
  });

  return res.data; // {id, name, webViewLink, webContentLink}
}

// Eliminar carpeta y su contenido en Drive
async function eliminarCarpetaProveedor(folderId) {
  if (!folderId) return;

  const drive = await getDriveClient();

  await drive.files.delete({
    fileId: folderId,
    supportsAllDrives: true
  });
}

module.exports = {
  crearCarpetaProveedor,
  subirPdfACarpeta,
  eliminarCarpetaProveedor
};

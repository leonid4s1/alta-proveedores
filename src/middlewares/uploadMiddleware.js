// src/middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Usamos almacenamiento en memoria; luego mandamos los buffers a Google Drive
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowedMime = 'application/pdf';
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === allowedMime && ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB por archivo
  }
});

// Aceptar varios PDFs bajo el mismo campo "documentos"
const uploadDocsMiddleware = upload.array('documentos', 20);

module.exports = { uploadDocsMiddleware };

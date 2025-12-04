// src/services/proveedores.service.js
const { query } = require('express');
const db = require('../config/firestore');
const { buildProveedor } = require('../models/proveedor.model');
const { crearCarpetaProveedor,
        subirPdfACarpeta,
        eliminarCarpetaProveedor
      } = require('./drive.service');

const COLLECTION = 'proveedores';

// Crear proveedor + carpeta en Drive + subir PDFs
async function crearProveedor(data, archivos = []) {
  const proveedor = buildProveedor(data);

  // Validacion que no exista un proveedor con el mismo RFC
  const rfc = proveedor?.datosGenerales?.rfc || null;

  if (rfc) {
    const dupSnapshot = await db
      .collection(COLLECTION)
      .where('datosGenerales.rfc', '==', rfc)
      .limit(1)
      .get();

    if (!dupSnapshot.empty) {
      const err = new Error('Ya existe un proveedor con el mismo RFC');
      err.status = 409;
      err.code = 'PROVEEDOR_DUPLICADO';
      throw err;
    }
  }

  // Nombre de carpeta: RFC_tipo_fecha
  const tipo = proveedor.tipo || 'SIN_TIPO';
  const timestamp = new Date().toISOString().substring(0, 19).replace(/[:T]/g, '-');
  const nombreCarpeta = `${rfc || 'SIN_RFC'}_${tipo}_${timestamp}`;

  // 1) Crear carpeta en Drive
  const carpeta = await crearCarpetaProveedor(nombreCarpeta);
  proveedor.driveFolderId = carpeta.id;

  // 2) Subir cada PDF a esa carpeta
  const docs = [];
  for (const file of archivos) {
    const fileRes = await subirPdfACarpeta(file, carpeta.id);
    docs.push({
      campo: file.fieldname,
      nombreOriginal: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      driveFileId: fileRes.id,
      webViewLink: fileRes.webViewLink || null,
      webContentLink: fileRes.webContentLink || null
    });
  }

  proveedor.documentos = docs;

  // Estado inicial + fecha de creación
  proveedor.estatus = 'pendiente_revision';
  proveedor.creadoEn = new Date();


  // 3) Guardar en Firestore
  const docRef = await db.collection(COLLECTION).add(proveedor);

  return {
    id: docRef.id,
    ...proveedor
  };
}

// Listado de proveedores
async function listarProveedores() {
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy('creadoEn', 'desc')
    .get();
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Obtener proveedor por ID
async function obtenerProveedorPorId(id) {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Proveedor no encontrado');
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

// Actualizar estatus del proveedor
async function actualizarEstatusProveedor(id, nuevoEstatus) {
  const permitidos = ['pendiente_revision', 'aprobado', 'rechazado'];

  if (!permitidos.includes(nuevoEstatus)) {
    throw new Error('Estatus no válido');
  }

  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Proveedor no encontrado');
  }

  await docRef.update({
    estatus: nuevoEstatus,
    actualizadoEn: new Date(),
  });

  const actualizado = await docRef.get();

  return {
    id: actualizado.id,
    ...actualizado.data(),
  };
}

// Eliminar proveedor y su carpeta en Drive
async function eliminarProveedor(id) {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Proveedor no encontrado');
  }

  const data = doc.data();
  const driveFileId = data.driveFolderId;

  // Intentar eliminar la carpeta en Drive (si existe)
  if (driveFileId) {
    try {
      await eliminarCarpetaProveedor(driveFileId);
    } catch (error) {
      console.error('Error eliminando carpeta en Drive:', error.message);
    }
  }

  // Borrar documento en Firestore
  await docRef.delete();

  return {id, eliminado: true};
}

module.exports = {
  crearProveedor,
  listarProveedores,
  obtenerProveedorPorId,
  actualizarEstatusProveedor,
  eliminarProveedor
};

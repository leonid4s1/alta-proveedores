// src/services/proveedores.service.js
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

  // ==========================
  // Mapeo de nombres de PDF
  // ==========================
  let etiquetasDocs = [];

  if (tipo === 'fisica') {
    etiquetasDocs = [
      'IDENTIFICACION_OFICIAL',
      'CONSTANCIA_SITUACION_FISCAL',
      'COMPROBANTE_DOMICILIO_FISCAL',
      'CARATULA_ESTADO_CUENTA',
      'CONSTANCIA_CUMPLIMIENTO_SAT',
      'CONSTANCIA_CUMPLIMIENTO_IMSS',
      'CONSTANCIA_CUMPLIMIENTO_INFONAVIT',
      'REPSE',
      'REGISTRO_PATRONAL',
      'PORTAFOLIO_EXPERIENCIA'
    ];
  } else if (tipo === 'moral') {
    etiquetasDocs = [
      'IDENTIFICACION_REPRESENTANTE',
      'CONSTANCIA_SITUACION_FISCAL_EMPRESA',
      'CONSTANCIA_SITUACION_FISCAL_REPRESENTANTE',
      'COMPROBANTE_DOMICILIO_FISCAL_EMPRESA',
      'ACTA_CONSTITUTIVA',
      'PODER_REPRESENTANTE',
      'CARATULA_ESTADO_CUENTA',
      'CONSTANCIA_CUMPLIMIENTO_SAT',
      'CONSTANCIA_CUMPLIMIENTO_IMSS',
      'CONSTANCIA_CUMPLIMIENTO_INFONAVIT',
      'REGISTRO_REPSE',
      'REGISTRO_PATRONAL',
      'ESTADOS_FINANCIEROS',
      'PORTAFOLIO_PROYECTOS'
    ];
  }

  // 2) Subir cada PDF a esa carpeta
  const docs = [];

  for (let i = 0; i < archivos.length; i++) {
    const file = archivos[i];

    // Etiqueta segun el orden del input en el formulario
    const MAPEO_DOCUMENTOS_MORAL = {
      id_representante: 'IDENTIFICACION_REPRESENTANTE',
      csf_pm: 'CONSTANCIA_SITUACION_FISCAL_EMPRESA',
      csf_rep: 'CONSTANCIA_SITUACION_FISCAL_REPRESENTANTE',
      domicilio_pm: 'COMPROBANTE_DOMICILIO_FISCAL_EMPRESA',
      acta_constitutiva: 'ACTA_CONSTITUTIVA',
      poder_rep: 'PODER_REPRESENTANTE',
      caratula_banco: 'ESTADO_CUENTA',
      cumplimiento_sat: 'CONSTANCIA_CUMPLIMIENTO_SAT',
      cumplimiento_imss: 'CONSTANCIA_CUMPLIMIENTO_IMSS',
      cumplimiento_infonavit: 'CONSTANCIA_CUMPLIMIENTO_INFONAVIT',
      repse: 'REGISTRO_REPSE',
      registro_patronal: 'REGISTRO_PATRONAL',
      estados_financieros: 'ESTADOS_FINANCIEROS',
      portafolio: 'PORTAFOLIO_PROYECTOS',
      cfdis_nomina: 'CFDIS_NOMINA',
      decl_pagos_imss: 'DECLARACIONES_PAGOS_IMSS',
      decl_pagos_infonavit: 'DECLARACIONES_PAGOS_INFONAVIT',
      decl_pagos_federales: 'DECLARACIONES_PAGOS_FEDERALES'
    };

    const etiqueta = MAPEO_DOCUMENTOS_MORAL[file.fieldname] || file.fieldname.toUpperCase();

    // Nombre final en Drive: RFC_ETIQUETA.pdf
    const nombreEnDriveBase = rfc || 'SIN_RFC';
    const nombreEnDrive = `${nombreEnDriveBase}_${etiqueta}.pdf`;

    const fileRes = await subirPdfACarpeta(file, carpeta.id, nombreEnDrive);

    docs.push({
      campo: file.fieldname,
      tipoDocumento: etiqueta,
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

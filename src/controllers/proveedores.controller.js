// src/controllers/proveedores.controller.js

// Título
doc.fontSize(12).text(`Tipo: ${proveedor.tipo || ''}`);
if (proveedor.tipo === 'moral') {
  doc.text(`Razón Social: ${proveedor.datosGenerales?.razonSocial || ''}`);
} else {
  const nombre = [
    proveedor.datosGenerales?.apellidoPaterno || '',
    proveedor.datosGenerales?.apellidoMaterno || '',
    proveedor.datosGenerales?.nombre || ''
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  doc.text(`Nombre: ${nombre}`);
}
doc.text(`RFC: ${rfc}`);
doc.text(`Estatus: ${proveedor.estatus || 'pendiente_revision'}`);

if (proveedor.creadoEn) {
  const d = proveedor.creadoEn._seconds
    ? new Date(proveedor.creadoEn._seconds * 1000)
    : new Date(proveedor.creadoEn);
  doc.text(`Creado en: ${d.toLocaleDateString()}`);
}

doc.moveDown();

// =====================
// Domicilio fiscal
// =====================
const dom = proveedor.domicilioFiscal || {};
doc.fontSize(14).text('Domicilio Fiscal', { underline: true });
doc.fontSize(12);
doc.text(`Calle: ${dom.calle || ''}`);
doc.text(`Número Exterior: ${dom.numExterior || ''}`); // ✅ FIX
doc.text(`Número Interior: ${dom.numInterior || ''}`); // ✅ FIX
doc.text(`CP: ${dom.cp || ''}`);
doc.text(`Colonia / Asentamiento: ${dom.colonia || ''}`);
doc.text(`Municipio / Alcaldía: ${dom.municipio || ''}`);
doc.text(`Estado: ${dom.estado || ''}`);
doc.text(`País: ${dom.pais || ''}`);

doc.moveDown();

// =====================
// Contacto
// =====================
const contacto = proveedor.contacto || {};
doc.fontSize(14).text('Contacto', { underline: true });
doc.fontSize(12);
doc.text(`Correo: ${contacto.email || ''}`);
doc.text(`Teléfono: ${contacto.telefono || ''}`);

doc.moveDown();

// =====================
// Datos bancarios
// =====================
const bancario = proveedor.bancario || {};
doc.fontSize(14).text('Datos Bancarios', { underline: true });
doc.fontSize(12);
doc.text(`Banco: ${bancario.banco || ''}`);
doc.text(`Cuenta: ${bancario.cuenta || ''}`);
doc.text(`CLABE: ${bancario.clabe || ''}`);

doc.moveDown();

// =====================
// Persona moral: Representante + Acta + Poder
// =====================
if (proveedor.tipo === 'moral') {
  // ---- Representante legal
  const rep = proveedor.representante || {};
  doc.fontSize(14).text('Representante Legal', { underline: true });
  doc.fontSize(12);

  const repNombre = [
    rep.apellidoPaterno || '',
    rep.apellidoMaterno || '',
    rep.nombre || '',
    rep.otrosNombres || ''
  ].join(' ').replace(/\s+/g, ' ').trim();

  doc.text(`Nombre: ${repNombre}`);
  doc.text(`RFC: ${rep.rfc || ''}`);
  doc.text(`CURP: ${rep.curp || ''}`);

  // ✅ Ocupación opcional (repOcupacion guardada como rep.ocupacion)
  if (rep.ocupacion) {
    doc.text(`Ocupación: ${rep.ocupacion}`);
  }

  doc.moveDown();

  // ---- Domicilio del representante
  const domRep = proveedor.domicilioRepresentante || {};
  doc.fontSize(14).text('Domicilio del Representante', { underline: true });
  doc.fontSize(12);
  doc.text(`Calle: ${domRep.calle || ''}`);
  doc.text(`Número Exterior: ${domRep.numExterior || ''}`);
  doc.text(`Número Interior: ${domRep.numInterior || ''}`);
  doc.text(`CP: ${domRep.cp || ''}`);
  doc.text(`Colonia / Asentamiento: ${domRep.colonia || ''}`);
  doc.text(`Municipio / Alcaldía: ${domRep.municipio || ''}`);
  doc.text(`Estado: ${domRep.estado || ''}`);
  doc.text(`País: ${domRep.pais || ''}`);

  doc.moveDown();

  // ---- Acta constitutiva
  const acta = proveedor.actaConstitutiva || {};
  const notarioActa = acta.notario || {};
  doc.fontSize(14).text('Acta Constitutiva', { underline: true });
  doc.fontSize(12);
  doc.text(`Número de escritura: ${acta.numEscritura || ''}`);
  doc.text(`Fecha de constitución: ${acta.fechaConstitucion || ''}`);
  doc.text(`Número de notaría: ${acta.numNotaria || ''}`);
  doc.text(`Estado notaría: ${acta.estadoNotaria || ''}`);

  const nombreNotarioActa = [
    notarioActa.apellidoPaterno || '',
    notarioActa.apellidoMaterno || '',
    notarioActa.nombre || '',
    notarioActa.otrosNombres || ''
  ].join(' ').replace(/\s+/g, ' ').trim();

  doc.text(`Notario: ${nombreNotarioActa}`);

  doc.moveDown();

  // ---- Poder del representante (si lo quieres en la hoja)
  const poder = proveedor.poderRepresentante || {};
  const notarioPoder = poder.notario || {};

  // Si todo viene vacío, no lo imprimas
  const hasPoder =
    poder.numEscritura || poder.fechaConstitucion || poder.numNotaria || poder.estadoNotaria ||
    notarioPoder.apellidoPaterno || notarioPoder.nombre;

  if (hasPoder) {
    doc.fontSize(14).text('Poder del Representante', { underline: true });
    doc.fontSize(12);
    doc.text(`Número de escritura: ${poder.numEscritura || ''}`);
    doc.text(`Fecha: ${poder.fechaConstitucion || ''}`);
    doc.text(`Número de notaría: ${poder.numNotaria || ''}`);
    doc.text(`Estado notaría: ${poder.estadoNotaria || ''}`);

    const nombreNotarioPoder = [
      notarioPoder.apellidoPaterno || '',
      notarioPoder.apellidoMaterno || '',
      notarioPoder.nombre || '',
      notarioPoder.otrosNombres || ''
    ].join(' ').replace(/\s+/g, ' ').trim();

    doc.text(`Notario: ${nombreNotarioPoder}`);
    doc.moveDown();
  }
}

doc.end();

// src/controllers/proveedores.controller.js
const PDFDocument = require('pdfkit');
const { crearProveedor,
        listarProveedores,
        obtenerProveedorPorId,
        actualizarEstatusProveedor,
        eliminarProveedor
      } = require('../services/proveedores.service');

// Chequeo proveedores existentes
const db = require("../config/firestore");

async function existePorRfc(req, res) {
  try {
    const rfc = String(req.query.rfc || "").trim().toUpperCase();
    if (!rfc) return res.status(400).json({ message: "RFC requerido" });

    const snap = await db
      .collection("proveedores")
      .where("datosGenerales.rfc", "==", rfc)
      .limit(1)
      .get();

    return res.json({ exists: !snap.empty });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error consultando RFC" });
  }
}

// POST /api/proveedores
async function crearProveedorController(req, res, next) {
  try {
    const data = req.body;          // campos de texto del form-data
    const archivos = req.files || []; // PDFs que manda multer

    // Validación básica del tipo
    if (!data.tipo || !['fisica', 'moral'].includes(data.tipo)) {
      return res.status(400).json({ message: 'tipo debe ser "fisica" o "moral"' });
    }

    const nuevoProveedor = await crearProveedor(data, archivos);

    return res.status(201).json({
      message: 'Proveedor creado correctamente',
      proveedor: nuevoProveedor
    });
  } catch (error) {
      // Si viene del check de duplicados, ya tiene status 409
      if (error.code === 'PROVEEDOR_DUPLICADO') {
        return res.status(error.status || 409).json({ message: error.message });
      }
    next(error);
  }
}

// GET /api/proveedores
async function obtenerProveedoresController(req, res, next) {
  try {
    const proveedores = await listarProveedores();

    return res.status(200).json({
      count: proveedores.length,
      proveedores
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/proveedores/:id
async function obtenerProveedorPorIdController(req, res, next) {
  try {
    const { id } = req.params;
    const proveedor = await obtenerProveedorPorId(id);

    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    return res.status(200).json({ proveedor });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/proveedores/:id/estatus
async function actualizarEstatusProveedorController(req, res, next) {
  try {
    const { id } = req.params;
    const { estatus } = req.body;

    if (!estatus) {
      return res.status(400).json({ message: 'Estatus es requerido' });
    }

    const proveedorActualizado = await actualizarEstatusProveedor(id, estatus);

    return res.status(200).json({
      message: 'Estatus del proveedor actualizado correctamente',
      proveedor: proveedorActualizado
    });
  } catch (error) {
    next(error);
  }
}

// DETETE /api/proveedores/:id
async function eliminarProveedorController(req, res, next) {
  try {
    const { id } = req.params;

    const resultado = await eliminarProveedor(id);

    return res.status(200).json({
      message: 'Proveedor eliminado correctamente',
      ...resultado
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/proveedores/:id/hoja -> Generar PDF
async function generarHojaProveedorController(req, res, next) {
  try {
    const { id } = req.params;
    const proveedor = await obtenerProveedorPorId(id);

    if (!proveedor) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }

    const rfc = proveedor.datosGenerales?.rfc || 'SIN_RFC';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="hoja_proveedor_${rfc}.pdf"`
    );
    const doc = new PDFDocument({margin: 50});

    doc.pipe(res);

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
    doc.text(
      `Estatus: ${proveedor.estatus || 'pendiente_revision'}`      
    );

    if (proveedor.creadoEn) {
      const d = proveedor.creadoEn._seconds
        ? new Date(proveedor.creadoEn._seconds * 1000)
        : new Date(proveedor.creadoEn);
      doc.text(`Creado en: ${d.toLocaleDateString()}`);
    }

    doc.moveDown();

    // Domicilio fiscal
    const dom = proveedor.domicilioFiscal || {};
    doc.fontSize(14).text('Domicilio Fiscal', { underline: true });
    doc.fontSize(12);
    doc.text(`Calle: ${dom.calle || ''}`);
    doc.text(`Número Exterior: ${dom.numeroExterior || ''}`);
    doc.text(`Número Interior: ${dom.numeroInterior || ''}`);
    doc.text(`CP: ${dom.cp || ''}`);
    doc.text(`Colonia / Asentamiento: ${dom.colonia || ''}`);
    doc.text(`Municipio / Alcaldía: ${dom.municipio || ''}`);
    doc.text(`Estado: ${dom.estado || ''}`);
    doc.text(`País: ${dom.pais || ''}`);

    doc.moveDown();

    // Contacto
    const contacto = proveedor.contacto || {};
    doc.fontSize(14).text('Contacto', { underline: true });
    doc.fontSize(12);
    doc.text(`Correo: ${contacto.email || ''}`);
    doc.text(`Teléfono: ${contacto.telefono || ''}`);

    doc.moveDown();

    // Bancario
    const bancario = proveedor.bancario || {};
    doc.fontSize(14).text('Datos Bancarios', { underline: true });
    doc.fontSize(12);
    doc.text(`Banco: ${bancario.banco || ''}`);
    doc.text(`Cuenta: ${bancario.cuenta || ''}`);
    doc.text(`CLABE: ${bancario.clabe || ''}`);

    doc.end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  crearProveedorController,
  obtenerProveedoresController,
  obtenerProveedorPorIdController,
  actualizarEstatusProveedorController,
  eliminarProveedorController,
  generarHojaProveedorController,
  existePorRfc
};

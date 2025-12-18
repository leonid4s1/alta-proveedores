// src/controllers/proveedores.controller.js
const PDFDocument = require("pdfkit");
const {
  crearProveedor,
  listarProveedores,
  obtenerProveedorPorId,
  actualizarEstatusProveedor,
  eliminarProveedor,
} = require("../services/proveedores.service");

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
    const data = req.body;
    const archivos = req.files || [];

    if (!data.tipo || !["fisica", "moral"].includes(data.tipo)) {
      return res.status(400).json({ message: 'tipo debe ser "fisica" o "moral"' });
    }

    const nuevoProveedor = await crearProveedor(data, archivos);

    return res.status(201).json({
      message: "Proveedor creado correctamente",
      proveedor: nuevoProveedor,
    });
  } catch (error) {
    if (error.code === "PROVEEDOR_DUPLICADO") {
      return res.status(error.status || 409).json({ message: error.message, code: error.code });
    }
    next(error);
  }
}

// GET /api/proveedores
async function obtenerProveedoresController(req, res, next) {
  try {
    const proveedores = await listarProveedores();
    return res.status(200).json({ count: proveedores.length, proveedores });
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
      return res.status(404).json({ message: "Proveedor no encontrado" });
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
      return res.status(400).json({ message: "Estatus es requerido" });
    }

    const proveedorActualizado = await actualizarEstatusProveedor(id, estatus);

    return res.status(200).json({
      message: "Estatus del proveedor actualizado correctamente",
      proveedor: proveedorActualizado,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/proveedores/:id
async function eliminarProveedorController(req, res, next) {
  try {
    const { id } = req.params;
    const resultado = await eliminarProveedor(id);

    return res.status(200).json({
      message: "Proveedor eliminado correctamente",
      ...resultado,
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
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    const rfc = proveedor.datosGenerales?.rfc || "SIN_RFC";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="hoja_proveedor_${rfc}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // =====================
    // Título
    // =====================
    doc.fontSize(12).text(`Tipo: ${proveedor.tipo || ""}`);

    if (proveedor.tipo === "moral") {
      doc.text(`Razón Social: ${proveedor.datosGenerales?.razonSocial || ""}`);
    } else {
      const nombre = [
        proveedor.datosGenerales?.apellidoPaterno || "",
        proveedor.datosGenerales?.apellidoMaterno || "",
        proveedor.datosGenerales?.nombre || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      doc.text(`Nombre: ${nombre}`);
    }

    doc.text(`RFC: ${rfc}`);
    doc.text(`Estatus: ${proveedor.estatus || "pendiente_revision"}`);

    if (proveedor.creadoEn) {
      const d = proveedor.creadoEn._seconds
        ? new Date(proveedor.creadoEn._seconds * 1000)
        : new Date(proveedor.creadoEn);
      doc.text(`Creado en: ${d.toLocaleDateString()}`);
    }

    doc.moveDown();

    // =====================
    // Domicilio fiscal (FIX numExterior/numInterior)
    // =====================
    const dom = proveedor.domicilioFiscal || {};
    doc.fontSize(14).text("Domicilio Fiscal", { underline: true });
    doc.fontSize(12);
    doc.text(`Calle: ${dom.calle || ""}`);
    doc.text(`Número Exterior: ${dom.numExterior || ""}`); // ✅ FIX (antes numeroExterior)
    doc.text(`Número Interior: ${dom.numInterior || ""}`); // ✅ FIX (antes numeroInterior)
    doc.text(`CP: ${dom.cp || ""}`);
    doc.text(`Colonia / Asentamiento: ${dom.colonia || ""}`);
    doc.text(`Municipio / Alcaldía: ${dom.municipio || ""}`);
    doc.text(`Estado: ${dom.estado || ""}`);
    doc.text(`País: ${dom.pais || ""}`);

    doc.moveDown();

    // =====================
    // Contacto
    // =====================
    const contacto = proveedor.contacto || {};
    doc.fontSize(14).text("Contacto", { underline: true });
    doc.fontSize(12);
    doc.text(`Correo: ${contacto.email || ""}`);
    doc.text(`Teléfono: ${contacto.telefono || ""}`);

    doc.moveDown();

    // =====================
    // Bancario
    // =====================
    const bancario = proveedor.bancario || {};
    doc.fontSize(14).text("Datos Bancarios", { underline: true });
    doc.fontSize(12);
    doc.text(`Banco: ${bancario.banco || ""}`);
    doc.text(`Cuenta: ${bancario.cuenta || ""}`);
    doc.text(`CLABE: ${bancario.clabe || ""}`);

    doc.moveDown();

    // =====================
    // Persona moral: Representante + Acta + Poder
    // =====================
    if (proveedor.tipo === "moral") {
      // Representante
      const rep = proveedor.representante || {};
      doc.fontSize(14).text("Representante Legal", { underline: true });
      doc.fontSize(12);

      const repNombre = [
        rep.apellidoPaterno || "",
        rep.apellidoMaterno || "",
        rep.nombre || "",
        rep.otrosNombres || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      doc.text(`Nombre: ${repNombre}`);
      doc.text(`RFC: ${rep.rfc || ""}`);
      doc.text(`CURP: ${rep.curp || ""}`);

      // Ocupación opcional (repOcupacion -> rep.ocupacion en el model)
      if (rep.ocupacion) doc.text(`Ocupación: ${rep.ocupacion}`);

      doc.moveDown();

      // Domicilio del representante
      const domRep = proveedor.domicilioRepresentante || {};
      doc.fontSize(14).text("Domicilio del Representante", { underline: true });
      doc.fontSize(12);
      doc.text(`Calle: ${domRep.calle || ""}`);
      doc.text(`Número Exterior: ${domRep.numExterior || ""}`);
      doc.text(`Número Interior: ${domRep.numInterior || ""}`);
      doc.text(`CP: ${domRep.cp || ""}`);
      doc.text(`Colonia / Asentamiento: ${domRep.colonia || ""}`);
      doc.text(`Municipio / Alcaldía: ${domRep.municipio || ""}`);
      doc.text(`Estado: ${domRep.estado || ""}`);
      doc.text(`País: ${domRep.pais || ""}`);

      doc.moveDown();

      // Acta constitutiva
      const acta = proveedor.actaConstitutiva || {};
      const notarioActa = acta.notario || {};

      doc.fontSize(14).text("Acta Constitutiva", { underline: true });
      doc.fontSize(12);
      doc.text(`Número de escritura: ${acta.numEscritura || ""}`);
      doc.text(`Fecha de constitución: ${acta.fechaConstitucion || ""}`);
      doc.text(`Número de notaría: ${acta.numNotaria || ""}`);
      doc.text(`Estado notaría: ${acta.estadoNotaria || ""}`);

      const nombreNotarioActa = [
        notarioActa.apellidoPaterno || "",
        notarioActa.apellidoMaterno || "",
        notarioActa.nombre || "",
        notarioActa.otrosNombres || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      doc.text(`Notario: ${nombreNotarioActa}`);

      doc.moveDown();

      // Poder del representante (si hay datos)
      const poder = proveedor.poderRepresentante || {};
      const notarioPoder = poder.notario || {};
      const hasPoder =
        poder.numEscritura ||
        poder.fechaConstitucion ||
        poder.numNotaria ||
        poder.estadoNotaria ||
        notarioPoder.apellidoPaterno ||
        notarioPoder.nombre;

      if (hasPoder) {
        doc.fontSize(14).text("Poder del Representante", { underline: true });
        doc.fontSize(12);
        doc.text(`Número de escritura: ${poder.numEscritura || ""}`);
        doc.text(`Fecha: ${poder.fechaConstitucion || ""}`);
        doc.text(`Número de notaría: ${poder.numNotaria || ""}`);
        doc.text(`Estado notaría: ${poder.estadoNotaria || ""}`);

        const nombreNotarioPoder = [
          notarioPoder.apellidoPaterno || "",
          notarioPoder.apellidoMaterno || "",
          notarioPoder.nombre || "",
          notarioPoder.otrosNombres || "",
        ]
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        doc.text(`Notario: ${nombreNotarioPoder}`);
        doc.moveDown();
      }
    }

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
  existePorRfc,
};

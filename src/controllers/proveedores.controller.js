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

    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    doc.pipe(res);

    // =====================
    // Helpers de formato
    // =====================
    const pageBottomY = () => doc.page.height - doc.page.margins.bottom;
    const ensureSpace = (needed = 60) => {
      if (doc.y + needed > pageBottomY()) doc.addPage();
    };

    const fmtDate = (value) => {
      if (!value) return "";
      const d = value?._seconds ? new Date(value._seconds * 1000) : new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString();
    };

    const safe = (v) => (v === null || v === undefined ? "" : String(v));

    const title = (text) => {
      ensureSpace(40);
      doc.font("Helvetica-Bold").fontSize(13).text(text);
      doc.moveDown(0.3);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor("#d0d0d0")
        .stroke();
      doc.moveDown(0.6);
      doc.font("Helvetica").fontSize(11);
    };

    const kv = (label, value) => {
      const v = safe(value);
      if (!v) return;
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(v);
    };

    const twoCol = (pairsLeft = [], pairsRight = []) => {
      ensureSpace(90);

      const leftX = doc.page.margins.left;
      const rightX = doc.page.width / 2 + 10;
      const colWidth = doc.page.width / 2 - doc.page.margins.left - 20;

      const yStart = doc.y;

      // Columna izquierda
      doc.x = leftX;
      doc.y = yStart;
      pairsLeft.forEach(([k, v]) => {
        if (!safe(v)) return;
        doc.font("Helvetica-Bold").text(`${k}: `, { continued: true, width: colWidth });
        doc.font("Helvetica").text(safe(v), { width: colWidth });
      });

      const yAfterLeft = doc.y;

      // Columna derecha
      doc.x = rightX;
      doc.y = yStart;
      pairsRight.forEach(([k, v]) => {
        if (!safe(v)) return;
        doc.font("Helvetica-Bold").text(`${k}: `, { continued: true, width: colWidth });
        doc.font("Helvetica").text(safe(v), { width: colWidth });
      });

      // Baja al mayor Y
      doc.x = leftX;
      doc.y = Math.max(yAfterLeft, doc.y) + 6;
      doc.font("Helvetica").fontSize(11);
    };

    // =====================
    // Header bonito
    // =====================
    const creadoEn = fmtDate(proveedor.creadoEn);
    const estatus = safe(proveedor.estatus || "pendiente_revision");
    const tipo = safe(proveedor.tipo || "");

    doc.font("Helvetica-Bold").fontSize(18).text("Hoja de Proveedor");
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(11).fillColor("#444");

    twoCol(
      [
        ["Tipo", tipo],
        ["RFC", rfc],
      ],
      [
        ["Estatus", estatus],
        ["Creado en", creadoEn],
      ]
    );

    doc.fillColor("#000");

    // =====================
    // Datos Generales
    // =====================
    title("Datos generales");

    if (proveedor.tipo === "moral") {
      const dg = proveedor.datosGenerales || {};
      twoCol(
        [
          ["Razón social", dg.razonSocial],
          ["RFC", dg.rfc],
        ],
        [
          ["Tipo", "Persona moral"],
        ]
      );
    } else {
      const dg = proveedor.datosGenerales || {};
      const nombre = [
        dg.apellidoPaterno || "",
        dg.apellidoMaterno || "",
        dg.nombre || "",
      ].join(" ").replace(/\s+/g, " ").trim();

      const ocup = proveedor.datosAdicionales?.ocupacion || "";

      twoCol(
        [
          ["Nombre", nombre],
          ["RFC", dg.rfc],
          ["CURP", dg.curp], // ✅ PF faltante
        ],
        [
          ["Tipo", "Persona física"],
          ["Ocupación", ocup], // ✅ opcional
        ]
      );
    }

    // =====================
    // Domicilio Fiscal
    // =====================
    title("Domicilio fiscal");
    const dom = proveedor.domicilioFiscal || {};
    twoCol(
      [
        ["Calle", dom.calle],
        ["No. exterior", dom.numExterior], // ✅
        ["No. interior", dom.numInterior], // ✅
        ["CP", dom.cp],
      ],
      [
        ["Colonia / Asentamiento", dom.colonia],
        ["Municipio / Alcaldía", dom.municipio],
        ["Estado", dom.estado],
        ["País", dom.pais],
      ]
    );

    // =====================
    // Contacto
    // =====================
    title("Contacto");
    const contacto = proveedor.contacto || {};
    twoCol(
      [
        ["Correo", contacto.email],
      ],
      [
        ["Teléfono", contacto.telefono],
      ]
    );

    // =====================
    // Datos Bancarios
    // =====================
    title("Datos bancarios");
    const bancario = proveedor.bancario || {};
    twoCol(
      [
        ["Banco", bancario.banco],
        ["Cuenta", bancario.cuenta],
      ],
      [
        ["CLABE", bancario.clabe],
      ]
    );

    // =====================
    // Secciones extra para MORAL
    // =====================
    if (proveedor.tipo === "moral") {
      // Representante
      title("Representante legal");
      const rep = proveedor.representante || {};
      const repNombre = [
        rep.apellidoPaterno || "",
        rep.apellidoMaterno || "",
        rep.nombre || "",
        rep.otrosNombres || "",
      ].join(" ").replace(/\s+/g, " ").trim();

      twoCol(
        [
          ["Nombre", repNombre],
          ["RFC", rep.rfc],
          ["CURP", rep.curp],
        ],
        [
          ["Ocupación", rep.ocupacion || ""], // ✅ opcional
        ]
      );

      // Domicilio representante
      title("Domicilio del representante");
      const domRep = proveedor.domicilioRepresentante || {};
      twoCol(
        [
          ["Calle", domRep.calle],
          ["No. exterior", domRep.numExterior],
          ["No. interior", domRep.numInterior],
          ["CP", domRep.cp],
        ],
        [
          ["Colonia / Asentamiento", domRep.colonia],
          ["Municipio / Alcaldía", domRep.municipio],
          ["Estado", domRep.estado],
          ["País", domRep.pais],
        ]
      );

      // Acta constitutiva
      title("Acta constitutiva");
      const acta = proveedor.actaConstitutiva || {};
      const notarioActa = acta.notario || {};
      const nombreNotarioActa = [
        notarioActa.apellidoPaterno || "",
        notarioActa.apellidoMaterno || "",
        notarioActa.nombre || "",
        notarioActa.otrosNombres || "",
      ].join(" ").replace(/\s+/g, " ").trim();

      twoCol(
        [
          ["No. escritura", acta.numEscritura],
          ["Fecha constitución", acta.fechaConstitucion],
        ],
        [
          ["No. notaría", acta.numNotaria],
          ["Estado notaría", acta.estadoNotaria],
        ]
      );
      kv("Notario", nombreNotarioActa);
      doc.moveDown();

      // Poder (solo si hay)
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
        title("Poder del representante");
        const nombreNotarioPoder = [
          notarioPoder.apellidoPaterno || "",
          notarioPoder.apellidoMaterno || "",
          notarioPoder.nombre || "",
          notarioPoder.otrosNombres || "",
        ].join(" ").replace(/\s+/g, " ").trim();

        twoCol(
          [
            ["No. escritura", poder.numEscritura],
            ["Fecha", poder.fechaConstitucion],
          ],
          [
            ["No. notaría", poder.numNotaria],
            ["Estado notaría", poder.estadoNotaria],
          ]
        );
        kv("Notario", nombreNotarioPoder);
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

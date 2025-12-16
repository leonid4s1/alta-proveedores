// src/routes/proveedores.routes.js
const express = require('express');
const router = express.Router();

const { uploadDocsMiddleware } = require('../middlewares/uploadMiddleware');
const {
  crearProveedorController,
  obtenerProveedoresController,
  obtenerProveedorPorIdController,
  actualizarEstatusProveedorController,
  eliminarProveedorController,
  generarHojaProveedorController,
  existePorRfc, // ✅ IMPORTA ESTA FUNCIÓN
} = require('../controllers/proveedores.controller');

// ✅ Chequeo de proveedores existentes
// Si montas este router en /api/proveedores -> esto queda: GET /api/proveedores/existe?rfc=XXXX
router.get('/existe', existePorRfc);

// POST /api/proveedores -> alta con PDFs
router.post('/', uploadDocsMiddleware, crearProveedorController);

// GET /api/proveedores -> listar todos los proveedores
router.get('/', obtenerProveedoresController);

// Generate PDF hoja de proveedor
router.get('/:id/hoja', generarHojaProveedorController);

// GET /api/proveedores/:id -> detalle
router.get('/:id', obtenerProveedorPorIdController);

// PATCH /api/proveedores/:id/estatus -> actualizar estatus
router.patch('/:id/estatus', actualizarEstatusProveedorController);

// DELETE /api/proveedores/:id -> eliminar proveedor
router.delete('/:id', eliminarProveedorController);

module.exports = router;

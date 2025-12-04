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
    generarHojaProveedorController
} = require('../controllers/proveedores.controller');

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

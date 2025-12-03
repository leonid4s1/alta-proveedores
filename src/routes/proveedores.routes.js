// src/routes/proveedores.routes.js
const express = require('express');
const router = express.Router();

const { uploadDocsMiddleware } = require('../middlewares/uploadMiddleware');
const { 
    crearProveedorController,
    obtenerProveedoresController,
    obtenerProveedorPorIdController,
    actualizarEstatusProveedorController
} = require('../controllers/proveedores.controller');

// POST /api/proveedores -> alta con PDFs
router.post('/', uploadDocsMiddleware, crearProveedorController);

// GET /api/proveedores -> listar todos los proveedores
router.get('/', obtenerProveedoresController);

// GET /api/proveedores/:id -> detalle
router.get('/:id', obtenerProveedorPorIdController);

// PATCH /api/proveedores/:id/estatus -> actualizar estatus
router.patch('/:id/estatus', actualizarEstatusProveedorController);

module.exports = router;

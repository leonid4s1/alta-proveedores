// src/controllers/proveedores.controller.js
const { crearProveedor,
        listarProveedores,
        obtenerProveedorPorId,
        actualizarEstatusProveedor
      } = require('../services/proveedores.service');

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
    next(error); // lo recoge el middleware de errores en app.js
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

module.exports = {
  crearProveedorController,
  obtenerProveedoresController,
  obtenerProveedorPorIdController,
  actualizarEstatusProveedorController
};

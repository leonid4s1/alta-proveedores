// src/app.js
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (css, js)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rutas
const formularioRoutes = require('./routes/formulario.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');

app.use('/', formularioRoutes);
app.use('/api/proveedores', proveedoresRoutes);

// Manejo básico de errores (placeholder)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor'
  });
});

module.exports = app;

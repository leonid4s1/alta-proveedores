// src/routes/formulario.routes.js
const express = require('express');
const path = require('path');
const router = express.Router();

// Formulario externo
router.get('/formulario', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'formulario.html'));
});

// Panel interno
router.get('/panel', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'panel.html'));
});

// Ruta raíz
router.get('/', (req, res) => {
  res.redirect('/formulario');
});

module.exports = router;

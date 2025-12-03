// src/models/proveedor.model.js

function buildProveedor(data) {
  const {
    tipo, // "fisica" o "moral"

    // --- Persona física ---
    apellidoPaterno,
    apellidoMaterno,
    nombre,
    otrosNombres,
    rfc,
    curp,

    // --- Persona moral ---
    razonSocial,

    // --- Domicilio fiscal empresa / persona ---
    calle,
    numExterior,
    numInterior,
    cp,
    colonia,
    municipio,
    estado,
    pais,

    // --- Acta constitutiva (persona moral) ---
    actaNumEscritura,
    actaFechaConstitucion,
    actaNotarioApellidoPaterno,
    actaNotarioApellidoMaterno,
    actaNotarioNombre,
    actaNotarioOtrosNombres,
    actaNumNotaria,
    actaNotarioEstado,

    // --- Representante legal (persona moral) ---
    repApellidoPaterno,
    repApellidoMaterno,
    repNombre,
    repOtrosNombres,

    // --- Poder del representante (persona moral) ---
    poderNumEscritura,
    poderFechaConstitucion,
    poderNotarioApellidoPaterno,
    poderNotarioApellidoMaterno,
    poderNotarioNombre,
    poderNotarioOtrosNombres,
    poderNumNotaria,
    poderNotarioEstado,

    // --- Datos fiscales del representante ---
    repRfc,
    repCurp,

    // --- Domicilio fiscal del representante ---
    repCalle,
    repNumExterior,
    repNumInterior,
    repCp,
    repColonia,
    repMunicipio,
    repEstado,
    repPais,

    // --- Datos adicionales comunes ---
    ocupacion,
    giro,

    // --- Contacto ---
    email,
    telefono,

    // --- Banco ---
    banco,
    cuenta,
    clabe
  } = data;

  const proveedor = {
    tipo: tipo || null,

    // Persona física o moral (empresa)
    datosGenerales: {
      apellidoPaterno: apellidoPaterno || null,
      apellidoMaterno: apellidoMaterno || null,
      nombre: nombre || null,
      otrosNombres: otrosNombres || null,
      razonSocial: razonSocial || null,
      rfc: rfc || null,           // RFC de persona física o empresa
      curp: curp || null          // CURP de persona física (en moral se usa repCurp abajo)
    },

    // Domicilio fiscal principal (persona física o empresa)
    domicilioFiscal: {
      calle: calle || null,
      numExterior: numExterior || null,
      numInterior: numInterior || null,
      cp: cp || null,
      colonia: colonia || null,
      municipio: municipio || null,
      estado: estado || null,
      pais: pais || 'México'
    },

    // Representante legal (solo se llenará para moral)
    representante: {
      apellidoPaterno: repApellidoPaterno || null,
      apellidoMaterno: repApellidoMaterno || null,
      nombre: repNombre || null,
      otrosNombres: repOtrosNombres || null,
      rfc: repRfc || null,
      curp: repCurp || null
    },

    // Domicilio fiscal del representante legal
    domicilioRepresentante: {
      calle: repCalle || null,
      numExterior: repNumExterior || null,
      numInterior: repNumInterior || null,
      cp: repCp || null,
      colonia: repColonia || null,
      municipio: repMunicipio || null,
      estado: repEstado || null,
      pais: repPais || null
    },

    // Datos del acta constitutiva de la empresa
    actaConstitutiva: {
      numEscritura: actaNumEscritura || null,
      fechaConstitucion: actaFechaConstitucion || null,
      numNotaria: actaNumNotaria || null,
      estadoNotaria: actaNotarioEstado || null,
      notario: {
        apellidoPaterno: actaNotarioApellidoPaterno || null,
        apellidoMaterno: actaNotarioApellidoMaterno || null,
        nombre: actaNotarioNombre || null,
        otrosNombres: actaNotarioOtrosNombres || null
      }
    },

    // Datos del poder del representante
    poderRepresentante: {
      numEscritura: poderNumEscritura || null,
      fechaConstitucion: poderFechaConstitucion || null,
      numNotaria: poderNumNotaria || null,
      estadoNotaria: poderNotarioEstado || null,
      notario: {
        apellidoPaterno: poderNotarioApellidoPaterno || null,
        apellidoMaterno: poderNotarioApellidoMaterno || null,
        nombre: poderNotarioNombre || null,
        otrosNombres: poderNotarioOtrosNombres || null
      }
    },

    // Ocupación / giro del proveedor (física o moral)
    datosAdicionales: {
      ocupacion: ocupacion || null,
      giro: giro || null
    },

    // Contacto
    contacto: {
      email: email || null,
      telefono: telefono || null
    },

    // Datos bancarios
    bancario: {
      banco: banco || null,
      cuenta: cuenta || null,
      clabe: clabe || null
    },

    documentos: [],       // se llena en el servicio con lo de Drive
    driveFolderId: null   // se llena en el servicio
  };

  return proveedor;
}

module.exports = { buildProveedor };

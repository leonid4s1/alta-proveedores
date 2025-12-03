const tipoSelect = document.getElementById("tipoProveedor");
const container = document.getElementById("formContainer");

let currentForm = null;

// Cuando cambia el tipo de proveedor, renderizamos el formulario correspondiente
tipoSelect.addEventListener("change", () => {
  const tipo = tipoSelect.value;

  if (tipo === "fisica") {
    container.innerHTML = renderPersonaFisica();
  } else if (tipo === "moral") {
    container.innerHTML = renderPersonaMoral();
  } else {
    container.innerHTML = "";
    currentForm = null;
    return;
  }

  // El formulario se inyecta dentro del contenedor
  currentForm = document.getElementById("formProveedor");

  attachSubmitListener();
  attachUppercaseListeners();
});

// =============================
// SUBMIT FORMULARIO
// =============================
function attachSubmitListener() {
  if (!currentForm) return;

  currentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const tipo = tipoSelect.value;
    if (!tipo) {
      alert("Selecciona primero el tipo de proveedor.");
      return;
    }

    // Por si acaso, aseguramos mayúsculas antes de enviar
    forceUppercaseInputs(currentForm, ['rfc', 'repRfc', 'curp', 'repCurp']);

    // 🔍 Validar según tipo
    const errors = validateProveedorForm(tipo, currentForm);
    if (errors.length > 0) {
      alert("Por favor corrige lo siguiente:\n\n" + errors.join("\n"));
      return;
    }

    const formData = new FormData(currentForm);
    formData.append("tipo", tipo);

    try {
      const resp = await fetch("/api/proveedores", {
        method: "POST",
        body: formData,
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error(data);
        alert(data.message || "Ocurrió un error al guardar el proveedor.");
        return;
      }

      alert("Proveedor creado correctamente.");
      console.log("Respuesta backend:", data);

      // limpiar el formulario y select
      currentForm.reset();
      tipoSelect.value = "";
      container.innerHTML = "";
      currentForm = null;
    } catch (error) {
      console.error(error);
      alert("Error de red al mandar el formulario.");
    }
  }, { once: true }); // para evitar múltiples listeners si cambian el tipo
}

// =============================
// MAYÚSCULAS AUTOMÁTICAS RFC / CURP
// =============================
function attachUppercaseListeners() {
  if (!currentForm) return;

  const rfcInputs = currentForm.querySelectorAll('input[name="rfc"], input[name="repRfc"]');
  const curpInputs = currentForm.querySelectorAll('input[name="curp"], input[name="repCurp"]');

  rfcInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  });

  curpInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  });
}

function forceUppercaseInputs(form, names) {
  names.forEach((name) => {
    const inputs = form.querySelectorAll(`input[name="${name}"]`);
    inputs.forEach((input) => {
      input.value = input.value.toUpperCase();
    });
  });
}

// =============================
// VALIDACIONES POR TIPO
// =============================
function validateProveedorForm(tipo, form) {
  const errors = [];

  // campos comunes (fisica y moral)
  validateCamposComunes(form, errors);

  if (tipo === "fisica") {
    validatePersonaFisica(form, errors);
  } else if (tipo === "moral") {
    validatePersonaMoral(form, errors);
  }

  // Validatr archivos PDF
  const files = form.querySelectorAll('input[type="file"][name = "documentos"]');
  files.forEach((input) => {
    if (input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== "application/pdf") {
        errors.push(`El archivo "${file.name}" debe ser un PDF.`);
      }
    }  
  });

  return errors;
}

function validateCamposComunes(form, errors) {
  const telefono = form.querySelector('input[name="telefono"]')?.value.trim();
  const cp = form.querySelector('input[name="cp"]')?.value.trim();
  const clabe = form.querySelector('input[name="clabe"]')?.value.trim();

  if (telefono && !/^\d{10}$/.test(telefono)) {
    errors.push("El teléfono móvil debe tener 10 dígitos numéricos.");
  }

  if (cp && !/^\d{5}$/.test(cp)) {
    errors.push("El código postal debe tener 5 dígitos numéricos.");
  }

  if (clabe && !/^\d{18}$/.test(clabe)) {
    errors.push("La cuenta CLABE debe tener 18 dígitos numéricos.");
  }
}

function validatePersonaFisica(form, errors) {
  const rfc = form.querySelector('input[name="rfc"]')?.value.trim();
  const curp = form.querySelector('input[name="curp"]')?.value.trim();

  // RFC persona física: 13 caracteres
  if (!rfc || rfc.length !== 13) {
    errors.push("El RFC de persona física debe tener 13 caracteres.");
  }

  // CURP: 18 caracteres
  if (!curp || curp.length !== 18) {
    errors.push("La CURP debe tener 18 caracteres.");
  }
}

function validatePersonaMoral(form, errors) {
  const rfcEmpresa = form.querySelector('input[name="rfc"]')?.value.trim();
  const repRfc = form.querySelector('input[name="repRfc"]')?.value.trim();
  const repCurp = form.querySelector('input[name="repCurp"]')?.value.trim();

  // RFC persona moral: 12 caracteres
  if (!rfcEmpresa || rfcEmpresa.length !== 12) {
    errors.push("El RFC de persona moral debe tener 12 caracteres.");
  }

  // RFC representante legal: 13 caracteres
  if (!repRfc || repRfc.length !== 13) {
    errors.push("El RFC del representante legal debe tener 13 caracteres.");
  }

  // CURP representante legal: 18 caracteres
  if (!repCurp || repCurp.length !== 18) {
    errors.push("La CURP del representante legal debe tener 18 caracteres.");
  }

  // CP del representante legal
  const repCp = form.querySelector('input[name="repCp"]')?.value.trim();
  if (repCp && !/^\d{5}$/.test(repCp)) {
    errors.push("El código postal del representante legal debe tener 5 dígitos numéricos.");
  }
}
// =============================
// FORMULARIO PERSONA FÍSICA
// =============================
function renderPersonaFisica() {
  return `
    <form id="formProveedor" enctype="multipart/form-data">
      <h2>Datos de Persona Física</h2>

      <label>Apellido paterno:</label>
      <input type="text" name="apellidoPaterno" required />

      <label>Apellido materno:</label>
      <input type="text" name="apellidoMaterno" />

      <label>Nombre:</label>
      <input type="text" name="nombre" required />

      <label>Otros nombres:</label>
      <input type="text" name="otrosNombres" />

      <label>RFC:</label>
      <input type="text" name="rfc" maxlength="13" required />

      <label>CURP:</label>
      <input type="text" name="curp" maxlength="18" required/>

      <h3>Domicilio fiscal</h3>

      <label>Calle:</label>
      <input type="text" name="calle" required />

      <label>Número exterior:</label>
      <input type="text" name="numExterior" required />

      <label>Número interior:</label>
      <input type="text" name="numInterior" />

      <label>Código postal:</label>
      <input type="text" name="cp" maxlength="5" inputmode="numeric" required />

      <label>Colonia / Asentamiento:</label>
      <input type="text" name="colonia" required />

      <label>Municipio / Alcaldía:</label>
      <input type="text" name="municipio" required />

      <label>Estado:</label>
      <input type="text" name="estado" required />

      <label>País:</label>
      <input type="text" name="pais" value="México" required />

      <h3>Ocupación y giro</h3>

      <label>Ocupación:</label>
      <input type="text" name="ocupacion" required/>

      <label>Giro:</label>
      <input type="text" name="giro" required/>

      <h3>Contacto y banco</h3>

      <label>Correo electrónico:</label>
      <input type="email" name="email" required/>

      <label>Teléfono móvil:</label>
      <input type="text" name="telefono" maxlength="10" inputmode="numeric" required />

      <label>Banco:</label>
      <input type="text" name="banco" required/>

      <label>Cuenta:</label>
      <input type="text" name="cuenta" inputmode="numeric" required/>

      <label>Cuenta CLABE:</label>
      <input type="text" name="clabe" maxlength="18" inputmode="numeric" required/>

      <h3>Documentos (PDF)</h3>

      <label>Identificación oficial (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de situación fiscal (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Comprobante de domicilio fiscal (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Carátula de estado de cuenta bancario (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de cumplimiento fiscal – SAT (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de cumplimiento – IMSS (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de cumplimiento – INFONAVIT (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>REPSE (opcional, PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" />

      <label>Registro patronal (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" />

      <label>Portafolio / experiencia previa (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" />

      <br><br>
      <button type="submit">Enviar</button>
    </form>
  `;
}

// =============================
// FORMULARIO PERSONA MORAL
// =============================
function renderPersonaMoral() {
  return `
    <form id="formProveedor" enctype="multipart/form-data">
      <h2>Datos de Persona Moral</h2>

      <label>Razón social:</label>
      <input type="text" name="razonSocial" required />

      <label>RFC de la empresa (12 caracteres):</label>
      <input type="text" name="rfc" maxlength="12" required />

      <!-- DOMICILIO FISCAL EMPRESA -->
      <h3>Domicilio fiscal de la empresa</h3>

      <label>Calle:</label>
      <input type="text" name="calle" required />

      <label>Número exterior:</label>
      <input type="text" name="numExterior" required />

      <label>Número interior (opcional):</label>
      <input type="text" name="numInterior" />

      <label>Código postal:</label>
      <input type="text" name="cp" maxlength="5" inputmode="numeric" required />

      <label>Colonia / Asentamiento:</label>
      <input type="text" name="colonia" required />

      <label>Municipio / Alcaldía:</label>
      <input type="text" name="municipio" required />

      <label>Estado:</label>
      <input type="text" name="estado" required />

      <label>País:</label>
      <input type="text" name="pais" value="México" required />

      <!-- ACTA CONSTITUTIVA -->
      <h3>Acta constitutiva</h3>

      <label>Número de escritura o instrumento:</label>
      <input type="text" name="actaNumEscritura" required/>

      <label>Fecha de constitución:</label>
      <input type="date" name="actaFechaConstitucion" required/>

      <h4>Nombre del notario (acta)</h4>

      <label>Apellido paterno:</label>
      <input type="text" name="actaNotarioApellidoPaterno" required/>

      <label>Apellido materno (opcional):</label>
      <input type="text" name="actaNotarioApellidoMaterno" />

      <label>Nombre:</label>
      <input type="text" name="actaNotarioNombre" required/>

      <label>Nombres (opcional):</label>
      <input type="text" name="actaNotarioOtrosNombres" />

      <label>Número de notaría:</label>
      <input type="text" name="actaNumNotaria" inputmode="numeric" required/>

      <label>Estado o entidad federativa (notaría):</label>
      <input type="text" name="actaNotarioEstado" required/>

      <!-- REPRESENTANTE LEGAL -->
      <h3>Nombre del representante legal</h3>

      <label>Apellido paterno:</label>
      <input type="text" name="repApellidoPaterno" required />

      <label>Apellido materno (opcional):</label>
      <input type="text" name="repApellidoMaterno" />

      <label>Nombre:</label>
      <input type="text" name="repNombre" required />

      <label>Nombres (opcional):</label>
      <input type="text" name="repOtrosNombres" />

      <!-- PODER DEL REPRESENTANTE -->
      <h3>Poder del representante</h3>

      <label>Número de escritura o instrumento:</label>
      <input type="text" name="poderNumEscritura" required/>

      <label>Fecha de constitución (poder):</label>
      <input type="date" name="poderFechaConstitucion" required/>

      <h4>Nombre del notario (poder)</h4>

      <label>Apellido paterno:</label>
      <input type="text" name="poderNotarioApellidoPaterno" required/>

      <label>Apellido materno (opcional):</label>
      <input type="text" name="poderNotarioApellidoMaterno" />

      <label>Nombre:</label>
      <input type="text" name="poderNotarioNombre" required/>

      <label>Nombres (opcional):</label>
      <input type="text" name="poderNotarioOtrosNombres" />

      <label>Número de notaría:</label>
      <input type="text" name="poderNumNotaria" inputmode="numeric" required/>

      <label>Estado o entidad federativa (notaría):</label>
      <input type="text" name="poderNotarioEstado" required/>

      <!-- RFC Y DOMICILIO DEL REPRESENTANTE -->
      <h3>Datos fiscales del representante legal</h3>

      <label>RFC del representante legal (13 caracteres):</label>
      <input type="text" name="repRfc" maxlength="13" required />

      <h4>Domicilio fiscal del representante</h4>

      <label>Calle:</label>
      <input type="text" name="repCalle" required/>

      <label>Número exterior:</label>
      <input type="text" name="repNumExterior" required/>

      <label>Número interior (opcional):</label>
      <input type="text" name="repNumInterior" />

      <label>Código postal:</label>
      <input type="text" name="repCp" maxlength="5" inputmode="numeric" required/>

      <label>Colonia / Asentamiento:</label>
      <input type="text" name="repColonia" required/>

      <label>Municipio / Alcaldía:</label>
      <input type="text" name="repMunicipio" required/>

      <label>Estado:</label>
      <input type="text" name="repEstado" required/>

      <label>País:</label>
      <input type="text" name="repPais" value="México" required/>

      <!-- OCUPACIÓN, GIRO, CURP, CONTACTO Y BANCO -->
      <h3>Datos adicionales</h3>

      <label>Ocupación:</label>
      <input type="text" name="ocupacion" required/>

      <label>Giro:</label>
      <input type="text" name="giro" required/>

      <label>CURP del representante (18 caracteres):</label>
      <input type="text" name="repCurp" maxlength="18" required/>

      <label>Correo electrónico:</label>
      <input type="email" name="email" required/>

      <label>Teléfono móvil:</label>
      <input type="text" name="telefono" maxlength="10" inputmode="numeric" required/>

      <label>Banco:</label>
      <input type="text" name="banco" required/>

      <label>Cuenta:</label>
      <input type="text" name="cuenta" inputmode="numeric" required/>

      <label>Cuenta CLABE:</label>
      <input type="text" name="clabe" maxlength="18" inputmode="numeric" required/>

      <!-- DOCUMENTOS (PDF) -->
      <h3>Documentos (PDF)</h3>

      <label>Identificación representante legal (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de situación fiscal empresa (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de situación fiscal representante (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Comprobante de domicilio fiscal empresa (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Acta constitutiva (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Poder del representante (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" />

      <label>Carátula de estado de cuenta bancario (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de cumplimiento fiscal – SAT (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de cumplimiento – IMSS (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Constancia de cumplimiento – INFONAVIT (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required />

      <label>Registro REPSE (opcional, PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" />

      <label>Registro patronal (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required/>

      <label>Estados financieros (último ejercicio) (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" required/>

      <label>Portafolio de proyectos / experiencia (PDF):</label>
      <input type="file" name="documentos" accept="application/pdf" />

      <br><br>
      <button type="submit">Enviar</button>
    </form>
  `;
}
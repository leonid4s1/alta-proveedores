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
  attachStepper(tipo);
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
  const files = form.querySelectorAll('input[type="file"]');
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
// ESTADO VISUAL DE INPUTS
// =============================
function applyInputState(input, state) {
  input.classList.remove("input-pending", "input-valid", "input-invalid" );

  if (state === "pending") {
    input.classList.add("input-pending");
  } else if (state === "valid") {
    input.classList.add("input-valid");
  } else if (state === "invalid") {
    input.classList.add("input-invalid");
  }
}

// Valida un solo campo y devuelve "pending" | "valid" | "invalid" | "none"
function validateField(tipo, input) {
  // no pintamos file inputs
  if (input.type === "file") return "none";

  const name = input.name;
  const rawValue = input.value || "";
  const value = rawValue.trim();
  let state = "none";

  // Obligatorio vacío -> pendiente (amarillo)
  if (input.required && !value) {
    state = "pending";
    applyInputState(input, state);
    return state;
  }

  // Si no es obligatorio y está vacío -> sin estado
  if (!input.required && !value) {
    applyInputState(input, "none"); // solo limpia clases
    return "none";
  }

  // A partir de aquí hay contenido, validamos formato
  let ok = true;

  // Reglas específicas
  if (name === "telefono") {
    ok = /^\d{10}$/.test(value);
  } else if (name === "cp" || name === "repCp") {
    ok = /^\d{5}$/.test(value);
  } else if (name === "clabe") {
    ok = /^\d{18}$/.test(value);
  } else if (name === "rfc") {
    if (tipo === "fisica") ok = value.length === 13;
    if (tipo === "moral") ok = value.length === 12;
  } else if (name === "curp" || name === "repCurp") {
    ok = value.length === 18;
  } else if (name === "repRfc") {
    ok = value.length === 13;
  }

  state = ok ? "valid" : "invalid";
  applyInputState(input, state);
  return state;
}

// =============================
// STEPPER POR SECCIONES
// =============================
function attachStepper(tipo) {
  if (!currentForm) return;

  const sections = currentForm.querySelectorAll(".form-section");

  if (!sections.length) return;

  // Colapsar todas menos la primera
  sections.forEach((sec, idx) => {
    if (idx === 0) {
      sec.classList.remove("collapsed");
    } else {
      sec.classList.add("collapsed");
    }
  });

  // Validacion por campo (blur / input)
  const inputs = currentForm.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    if (input.type === "file") return;

    input.addEventListener("blur", () => validateField(tipo, input));
    input.addEventListener("input", () => validateField(tipo, input));
  });

  // Botones "Guardar y continuar"
  const nextButtons = currentForm.querySelectorAll(".btn-next-section");
  nextButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentId = btn.closest(".form-section")?.dataset.sectionId;
      const nextId = btn.dataset.next;

      if (!currentId || !nextId) return;

      const ok = validateSection(tipo, currentId);
      if (!ok) {
        alert("Revisa los campos marcados en rojo o amarillo");
        return;
      }

      const currentSec = currentForm.querySelector(
        `.form-section[data-section-id="${currentId}"]`
      );
      const nextSec = currentForm.querySelector(
        `.form-section[data-section-id="${nextId}"]`
      );

      if (currentSec) currentSec.classList.add("collapsed");
      if (nextSec) nextSec.classList.remove("collapsed");

      // Llevar scroll al inicio de las siguiente seccion
      if (nextSec) {
        nextSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// Valida todos los camspos de una seccion
function validateSection(tipo, sectionId) {
  if (!currentForm) return false;

  const section = currentForm.querySelector(
    `.form-section[data-section-id="${sectionId}"]`
  );
  if (!section) return false;

  const inputs = section.querySelectorAll("input, select, textarea");
  let hasError = false;

  inputs.forEach((input) => {
    const state = validateField(tipo, input);
    if (input.required && state !== "valid") {
      hasError = true;
    }
  });

  return !hasError;
}

function renderPersonaFisica() {
  return `
    <form id="formProveedor" enctype="multipart/form-data">

      <!-- Sección 1: Datos de persona física -->
      <div class="form-section" data-section-id="pf-datos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">1</span>
            <h3>Datos de Persona Física</h3>
          </div>
        </div>
        <div class="form-section-body">
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

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-domicilio">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 2: Domicilio fiscal -->
      <div class="form-section" data-section-id="pf-domicilio">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">2</span>
            <h3>Domicilio fiscal</h3>
          </div>
        </div>
        <div class="form-section-body">
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

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-contacto">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 3: Ocupación / contacto / banco -->
      <div class="form-section" data-section-id="pf-contacto">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">3</span>
            <h3>Ocupación, contacto y banco</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Ocupación:</label>
          <input type="text" name="ocupacion" required/>

          <label>Giro:</label>
          <input type="text" name="giro" required/>

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

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-documentos">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 4: Documentos -->
      <div class="form-section" data-section-id="pf-documentos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">4</span>
            <h3>Documentos (PDF)</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Identificación oficial (PDF):</label>
          <input type="file" name="docIdentificacionOficial" accept="application/pdf" required />

          <label>Constancia de situación fiscal (PDF):</label>
          <input type="file" name="docConstanciaFiscal" accept="application/pdf" required />

          <label>Comprobante de domicilio fiscal (PDF):</label>
          <input type="file" name="docComprobanteDomicilio" accept="application/pdf" required />

          <label>Carátula de estado de cuenta bancario (PDF):</label>
          <input type="file" name="docEstadoCuenta" accept="application/pdf" required />

          <label>Constancia de cumplimiento fiscal – SAT (PDF):</label>
          <input type="file" name="docCumplimientoSAT" accept="application/pdf" required />

          <label>Constancia de cumplimiento – IMSS (PDF):</label>
          <input type="file" name="docCumplimientoIMSS" accept="application/pdf" required />

          <label>Constancia de cumplimiento – INFONAVIT (PDF):</label>
          <input type="file" name="docCumplimientoINFONAVIT" accept="application/pdf" required />

          <label>REPSE (opcional, PDF):</label>
          <input type="file" name="docREPSE" accept="application/pdf" />

          <label>Registro patronal (PDF):</label>
          <input type="file" name="docRegistroPatronal" accept="application/pdf" />

          <label>Portafolio / experiencia previa (PDF):</label>
          <input type="file" name="docPortafolio" accept="application/pdf" />

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              Enviar solicitud
            </button>
          </div>
        </div>
      </div>
    </form>
  `;
}

// =============================
// FORMULARIO PERSONA MORAL (con secciones)
// =============================
function renderPersonaMoral() {
  return `
    <form id="formProveedor" enctype="multipart/form-data">
      
      <!-- Sección 1: Datos de Persona Moral -->
      <div class="form-section" data-section-id="pm-datos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">1</span>
            <h3>Datos de Persona Moral</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Razón social:</label>
          <input type="text" name="razonSocial" required />

          <label>RFC de la empresa (12 caracteres):</label>
          <input type="text" name="rfc" maxlength="12" required />

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-domicilio">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 2: Domicilio fiscal de la empresa -->
      <div class="form-section" data-section-id="pm-domicilio">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">2</span>
            <h3>Domicilio fiscal de la empresa</h3>
          </div>
        </div>
        <div class="form-section-body">
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

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-acta">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 3: Acta constitutiva -->
      <div class="form-section" data-section-id="pm-acta">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">3</span>
            <h3>Acta constitutiva</h3>
          </div>
        </div>
        <div class="form-section-body">
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

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-rep">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 4: Datos fiscales del representante legal -->
      <div class="form-section" data-section-id="pm-rep">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">4</span>
            <h3>Datos fiscales del representante legal</h3>
          </div>
        </div>
        <div class="form-section-body">
          <h4>Nombre del representante legal</h4>

          <label>Apellido paterno:</label>
          <input type="text" name="repApellidoPaterno" required />

          <label>Apellido materno (opcional):</label>
          <input type="text" name="repApellidoMaterno" />

          <label>Nombre:</label>
          <input type="text" name="repNombre" required />

          <label>Nombres (opcional):</label>
          <input type="text" name="repOtrosNombres" />

          <h4>Poder del representante</h4>

          <label>Número de escritura o instrumento:</label>
          <input type="text" name="poderNumEscritura" required/>

          <label>Fecha de constitución (poder):</label>
          <input type="date" name="poderFechaConstitucion" required/>

          <label>Apellido paterno del notario:</label>
          <input type="text" name="poderNotarioApellidoPaterno" required/>

          <label>Apellido materno del notario (opcional):</label>
          <input type="text" name="poderNotarioApellidoMaterno" />

          <label>Nombre del notario:</label>
          <input type="text" name="poderNotarioNombre" required/>

          <label>Nombres del notario (opcional):</label>
          <input type="text" name="poderNotarioOtrosNombres" />

          <label>Número de notaría:</label>
          <input type="text" name="poderNumNotaria" inputmode="numeric" required/>

          <label>Estado o entidad federativa (notaría):</label>
          <input type="text" name="poderNotarioEstado" required/>

          <h4>RFC y domicilio fiscal del representante</h4>

          <label>RFC del representante legal (13 caracteres):</label>
          <input type="text" name="repRfc" maxlength="13" required />

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

          <label>CURP del representante (18 caracteres):</label>
          <input type="text" name="repCurp" maxlength="18" required/>

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-extra">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 5: Datos adicionales -->
      <div class="form-section" data-section-id="pm-extra">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">5</span>
            <h3>Datos adicionales</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Ocupación:</label>
          <input type="text" name="ocupacion" required/>

          <label>Giro:</label>
          <input type="text" name="giro" required/>

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

          <div class="section-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-documentos">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 6: Documentos (PDF) -->
      <div class="form-section" data-section-id="pm-documentos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">6</span>
            <h3>Documentos (PDF)</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Identificación representante legal (PDF):</label>
          <input type="file" name="docPmIdentificacionRep" accept="application/pdf" required />

          <label>Constancia de situación fiscal empresa (PDF):</label>
          <input type="file" name="docPmConstanciaFiscalEmpresa" accept="application/pdf" required />

          <label>Constancia de situación fiscal representante (PDF):</label>
          <input type="file" name="docPmConstanciaFiscalRep" accept="application/pdf" required />

          <label>Comprobante de domicilio fiscal empresa (PDF):</label>
          <input type="file" name="docPmComprobanteDomicilioEmpresa" accept="application/pdf" required />

          <label>Acta constitutiva (PDF):</label>
          <input type="file" name="docPmActaConstitutiva" accept="application/pdf" required />

          <label>Poder del representante (PDF):</label>
          <input type="file" name="docPmPoderRep" accept="application/pdf" />

          <label>Carátula de estado de cuenta bancario (PDF):</label>
          <input type="file" name="docPmEstadoCuenta" accept="application/pdf" required />

          <label>Constancia de cumplimiento fiscal – SAT (PDF):</label>
          <input type="file" name="docPmCumplimientoSAT" accept="application/pdf" required />

          <label>Constancia de cumplimiento – IMSS (PDF):</label>
          <input type="file" name="docPmCumplimientoIMSS" accept="application/pdf" required />

          <label>Constancia de cumplimiento – INFONAVIT (PDF):</label>
          <input type="file" name="docPmCumplimientoINFONAVIT" accept="application/pdf" required />

          <label>Registro REPSE (opcional, PDF):</label>
          <input type="file" name="docPmREPSE" accept="application/pdf" />

          <label>Registro patronal (PDF):</label>
          <input type="file" name="docPmRegistroPatronal" accept="application/pdf" required />

          <label>Estados financieros (último ejercicio) (PDF):</label>
          <input type="file" name="docPmEstadosFinancieros" accept="application/pdf" required />

          <label>Portafolio de proyectos / experiencia (PDF):</label>
          <input type="file" name="docPmPortafolio" accept="application/pdf" />

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">
              Enviar solicitud
            </button>
          </div>
        </div>
      </div>
    </form>
  `;
}
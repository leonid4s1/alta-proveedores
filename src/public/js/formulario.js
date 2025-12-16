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
  }

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

  currentForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const tipo = tipoSelect.value;

      // Validación rápida
      const errors = validateProveedorForm(tipo, currentForm);
      if (errors.length) {
        alert(errors.join("\n"));
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
    },
    { once: true }
  ); // para evitar múltiples listeners si cambian el tipo
}

// =============================
// VALIDACIÓN
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
  const fileInputs = form.querySelectorAll('input[type="file"]');
  fileInputs.forEach((input) => {
    const f = input.files && input.files[0];
    if (f) {
      const name = (f.name || "").toLowerCase();
      const okExt = name.endsWith(".pdf");
      const okMime = f.type === "application/pdf";
      if (!okExt || !okMime) {
        errors.push("Solo se permiten archivos PDF.");
      }
    }
  });

  return errors;
}

function validateCamposComunes(form, errors) {
  // contacto
  const email = form.querySelector('input[name="email"]')?.value.trim();
  const telefono = form.querySelector('input[name="telefono"]')?.value.trim();

  if (!email) errors.push("Email es requerido.");
  if (!telefono) errors.push("Teléfono es requerido.");

  // bancario
  const banco = form.querySelector('input[name="banco"]')?.value.trim();
  const cuenta = form.querySelector('input[name="cuenta"]')?.value.trim();
  const clabe = form.querySelector('input[name="clabe"]')?.value.trim();

  if (!banco) errors.push("Banco es requerido.");
  if (!cuenta) errors.push("Cuenta es requerida.");
  if (!clabe || clabe.length !== 18)
    errors.push("CLABE es requerida (18 dígitos).");
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
}

// =============================
// UPPERCASE LISTENERS
// =============================
function attachUppercaseListeners() {
  if (!currentForm) return;

  // Campos que se deben convertir a mayúsculas al escribir
  const uppercaseInputs = currentForm.querySelectorAll(
    'input[name="rfc"], input[name="curp"], input[name="repRfc"], input[name="repCurp"]'
  );

  uppercaseInputs.forEach((input) => {
    input.addEventListener("input", () => {
      input.value = (input.value || "").toUpperCase();
    });
  });
}

// =============================
// STEPPER (secciones)
// =============================
function attachStepper(tipo) {
  if (!currentForm) return;

  const sections = currentForm.querySelectorAll(".form-section");
  const navButtons = currentForm.querySelectorAll(".btn-next-section, .btn-prev-section");

  // Mostrar solo la primera sección al render
  sections.forEach((sec, idx) => {
    sec.style.display = idx === 0 ? "block" : "none";
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const nextId = btn.getAttribute("data-next");
      const prevId = btn.getAttribute("data-prev");

      if (nextId) {
        const target = currentForm.querySelector(
          `.form-section[data-section-id="${nextId}"]`
        );
        if (target) {
          // Validación visual: marcar inválidos los required vacíos
          markRequiredFields(tipo);
          // si hay inválidos, no avanzar
          if (currentForm.querySelector(".input-invalid")) {
            alert("Por favor completa los campos requeridos antes de continuar.");
            return;
          }
          sections.forEach((s) => (s.style.display = "none"));
          target.style.display = "block";
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      if (prevId) {
        const target = currentForm.querySelector(
          `.form-section[data-section-id="${prevId}"]`
        );
        if (target) {
          sections.forEach((s) => (s.style.display = "none"));
          target.style.display = "block";
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
}

function markRequiredFields(tipo) {
  if (!currentForm) return;

  const visibleSection = Array.from(currentForm.querySelectorAll(".form-section")).find(
    (sec) => sec.style.display !== "none"
  );
  if (!visibleSection) return;

  const inputs = visibleSection.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    const state = validateField(tipo, input);
    paintFieldState(input, state);
  });
}

// Valida un solo campo y devuelve "pending" | "valid" | "invalid" | "none"
function validateField(tipo, input) {
  // no pintamos file inputs
  if (input.type === "file") return "none";

  const name = input.name;
  const rawValue = input.value || "";
  const value = rawValue.trim();
  let state = "none";

  // Obligatorio vacío -> pending
  if (input.required && !value) return "pending";

  // si no es required y está vacío, no validar
  if (!input.required && !value) return "none";

  // Validaciones específicas
  if (name === "rfc") {
    state = tipo === "moral" ? (value.length === 12 ? "valid" : "invalid") : (value.length === 13 ? "valid" : "invalid");
  } else if (name === "curp") {
    state = value.length === 18 ? "valid" : "invalid";
  } else if (name === "repRfc") {
    state = value.length === 13 ? "valid" : "invalid";
  } else if (name === "repCurp") {
    state = value.length === 18 ? "valid" : "invalid";
  } else {
    // genérico: si required y tiene valor -> valid
    state = input.required ? "valid" : "none";
  }

  return state;
}

function paintFieldState(input, state) {
  input.classList.remove("input-pending", "input-valid", "input-invalid");

  if (state === "pending") input.classList.add("input-pending");
  if (state === "valid") input.classList.add("input-valid");
  if (state === "invalid") input.classList.add("input-invalid");
}

// =============================
// HTML FORMS
// =============================
function renderPersonaFisica() {
  return `
    <form id="formProveedor" enctype="multipart/form-data">
      
      <!-- Sección 1: Datos de Persona Física -->
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

          <label>Apellido materno (opcional):</label>
          <input type="text" name="apellidoMaterno" />

          <label>Nombre:</label>
          <input type="text" name="nombre" required />

          <label>Otros nombres (opcional):</label>
          <input type="text" name="otrosNombres" />

          <label>RFC (13 caracteres):</label>
          <input type="text" name="rfc" maxlength="13" required />

          <label>CURP (18 caracteres):</label>
          <input type="text" name="curp" maxlength="18" required />

          <div class="form-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-domicilio">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 2: Domicilio Fiscal -->
      <div class="form-section" data-section-id="pf-domicilio">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">2</span>
            <h3>Domicilio Fiscal</h3>
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

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pf-datos">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-contacto">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 3: Contacto -->
      <div class="form-section" data-section-id="pf-contacto">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">3</span>
            <h3>Contacto</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Email:</label>
          <input type="email" name="email" required />

          <label>Teléfono:</label>
          <input type="text" name="telefono" required />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pf-domicilio">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-bancario">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 4: Datos Bancarios -->
      <div class="form-section" data-section-id="pf-bancario">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">4</span>
            <h3>Datos Bancarios</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Banco:</label>
          <input type="text" name="banco" required />

          <label>Número de cuenta:</label>
          <input type="text" name="cuenta" required />

          <label>CLABE interbancaria (18 dígitos):</label>
          <input type="text" name="clabe" maxlength="18" inputmode="numeric" required />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pf-contacto">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pf-documentos">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 5: Documentos -->
      <div class="form-section" data-section-id="pf-documentos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">5</span>
            <h3>Documentos (PDF)</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Identificación oficial (PDF):</label>
          <input type="file" name="docPfIdentificacion" accept="application/pdf" required />

          <label>Constancia de situación fiscal (PDF):</label>
          <input type="file" name="docPfConstanciaFiscal" accept="application/pdf" required />

          <label>Comprobante de domicilio fiscal (PDF):</label>
          <input type="file" name="docPfDomicilioFiscal" accept="application/pdf" required />

          <label>Carátula de estado de cuenta bancario (PDF):</label>
          <input type="file" name="docPfCaratulaBanco" accept="application/pdf" required />

          <label>Constancia de cumplimiento fiscal – SAT (PDF):</label>
          <input type="file" name="docPfCumplimientoSAT" accept="application/pdf" required />

          <label>Constancia de cumplimiento – IMSS (opcional, PDF):</label>
          <input type="file" name="docPfCumplimientoIMSS" accept="application/pdf" />

          <label>Constancia de cumplimiento – INFONAVIT (opcional, PDF):</label>
          <input type="file" name="docPfCumplimientoINFONAVIT" accept="application/pdf" />

          <label>Registro REPSE (opcional, PDF):</label>
          <input type="file" name="docPfREPSE" accept="application/pdf" />

          <label>Registro patronal (opcional, PDF):</label>
          <input type="file" name="docPfRegistroPatronal" accept="application/pdf" />

          <label>Portafolio / experiencia (opcional, PDF):</label>
          <input type="file" name="docPfPortafolio" accept="application/pdf" />

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

          <label>RFC (12 caracteres):</label>
          <input type="text" name="rfc" maxlength="12" required />

          <div class="form-actions">
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-domicilio">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 2: Domicilio Fiscal Empresa -->
      <div class="form-section" data-section-id="pm-domicilio">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">2</span>
            <h3>Domicilio Fiscal (Persona Moral)</h3>
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

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pm-datos">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-contacto">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 3: Contacto -->
      <div class="form-section" data-section-id="pm-contacto">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">3</span>
            <h3>Contacto</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Email:</label>
          <input type="email" name="email" required />

          <label>Teléfono:</label>
          <input type="text" name="telefono" required />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pm-domicilio">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-bancario">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 4: Datos Bancarios -->
      <div class="form-section" data-section-id="pm-bancario">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">4</span>
            <h3>Datos Bancarios</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Banco:</label>
          <input type="text" name="banco" required />

          <label>Número de cuenta:</label>
          <input type="text" name="cuenta" required />

          <label>CLABE interbancaria (18 dígitos):</label>
          <input type="text" name="clabe" maxlength="18" inputmode="numeric" required />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pm-contacto">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-representante">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 5: Datos del Representante Legal -->
      <div class="form-section" data-section-id="pm-representante">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">5</span>
            <h3>Datos fiscales del representante legal</h3>
          </div>
        </div>
        <div class="form-section-body">
          <label>Apellido paterno:</label>
          <input type="text" name="repApellidoPaterno" required />

          <label>Apellido materno (opcional):</label>
          <input type="text" name="repApellidoMaterno" />

          <label>Nombre:</label>
          <input type="text" name="repNombre" required />

          <label>Nombres (opcional):</label>
          <input type="text" name="repOtrosNombres" />

          <h4>RFC y domicilio fiscal del representante</h4>

          <label>RFC del representante legal (13 caracteres):</label>
          <input type="text" name="repRfc" maxlength="13" required />

          <label>CURP del representante legal (18 caracteres):</label>
          <input type="text" name="repCurp" maxlength="18" required />

          <label>Calle:</label>
          <input type="text" name="repCalle" required />

          <label>Número exterior:</label>
          <input type="text" name="repNumExterior" required />

          <label>Número interior (opcional):</label>
          <input type="text" name="repNumInterior" />

          <label>Código postal:</label>
          <input type="text" name="repCp" maxlength="5" inputmode="numeric" required />

          <label>Colonia / Asentamiento:</label>
          <input type="text" name="repColonia" required />

          <label>Municipio / Alcaldía:</label>
          <input type="text" name="repMunicipio" required />

          <label>Estado:</label>
          <input type="text" name="repEstado" required />

          <label>País:</label>
          <input type="text" name="repPais" value="México" required />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pm-bancario">
              Atrás
            </button>
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
          <h4>Segmento 1: Documentos fiscales básicos (obligatorios)</h4>

          <label>Identificación oficial del representante legal (INE / Pasaporte) (PDF):</label>
          <input type="file" name="docPmIdentificacionRep" accept="application/pdf" required />

          <label>Constancia de situación fiscal (Persona moral) (PDF):</label>
          <small class="field-hint">Fecha no mayor a 1 mes</small>
          <input type="file" name="docPmConstanciaFiscalEmpresa" accept="application/pdf" required />

          <label>Constancia de situación fiscal (Representante legal) (PDF):</label>
          <input type="file" name="docPmConstanciaFiscalRep" accept="application/pdf" required />

          <label>Comprobante de domicilio fiscal (Persona moral) (PDF):</label>
          <small class="field-hint">Fecha no mayor a 1 mes</small>
          <input type="file" name="docPmDomicilioFiscalEmpresa" accept="application/pdf" required />

          <hr class="section-divider" />

          <h4>Segmento 2: Constitución y representación</h4>

          <label>Acta constitutiva y/o última protocolización (PDF):</label>
          <input type="file" name="docPmActaConstitutiva" accept="application/pdf" required />

          <label>Poder del representante legal (PDF):</label>
          <small class="field-hint">Opcional si no aparece en el acta constitutiva</small>
          <input type="file" name="docPmPoderRepresentante" accept="application/pdf" />

          <hr class="section-divider" />

          <h4>Segmento 3: Bancario y SAT (obligatorios)</h4>

          <label>Carátula de estado de cuenta bancario (PDF):</label>
          <small class="field-hint">Fecha no mayor a 1 mes</small>
          <input type="file" name="docPmCaratulaBanco" accept="application/pdf" required />

          <label>Constancia de cumplimiento fiscal - SAT (PDF):</label>
          <small class="field-hint">Fecha no mayor a 1 mes</small>
          <input type="file" name="docPmCumplimientoSAT" accept="application/pdf" required />

          <hr class="section-divider" />

          <h4>Segmento 4: Documentos opcionales</h4>
          <p class="field-hint">Todos los documentos de este segmento son opcionales.</p>

          <label>Constancia de cumplimiento - IMSS (PDF):</label>
          <small class="field-hint">Fecha no mayor a 1 mes</small>
          <input type="file" name="docPmCumplimientoIMSS" accept="application/pdf" />

          <label>Constancia de cumplimiento - INFONAVIT (PDF):</label>
          <small class="field-hint">Fecha no mayor a 1 mes</small>
          <input type="file" name="docPmCumplimientoINFONAVIT" accept="application/pdf" />

          <label>REPSE (Registro de Prestadoras de Servicios Especializados) (PDF):</label>
          <small class="field-hint">Aplica solo si se prestan servicios especializados</small>
          <input type="file" name="docPmREPSE" accept="application/pdf" />

          <label>Registro patronal (PDF):</label>
          <input type="file" name="docPmRegistroPatronal" accept="application/pdf" />

          <label>Estados financieros (Último ejercicio fiscal) (PDF):</label>
          <input type="file" name="docPmEstadosFinancieros" accept="application/pdf" />

          <label>Portafolio de proyectos y/o experiencia previa (PDF):</label>
          <input type="file" name="docPmPortafolio" accept="application/pdf" />

          <hr class="section-divider" />

          <h4>Segmento 5: Documentación adicional obligatoria si aplica REPSE</h4>
          <p class="field-hint">Todos los documentos de este apartado son opcionales.</p>

          <label>CFDIs de nómina (PDF):</label>
          <input type="file" name="docPmCfdisNomina" accept="application/pdf" />

          <label>Declaraciones y pagos - IMSS (PDF):</label>
          <input type="file" name="docPmDeclaracionesPagosIMSS" accept="application/pdf" />

          <label>Declaraciones y pagos - INFONAVIT (PDF):</label>
          <input type="file" name="docPmDeclaracionesPagosINFONAVIT" accept="application/pdf" />

          <label>Declaraciones y pagos - Impuestos federales (PDF):</label>
          <input type="file" name="docPmDeclaracionesPagosFederales" accept="application/pdf" />

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

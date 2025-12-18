const tipoSelect = document.getElementById("tipoProveedor");
const container = document.getElementById("formContainer");

let currentForm = null;

// ✅ Flag global: evita doble envío
let isSubmitting = false;

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
  attachLiveValidation(tipo);
  attachStepper(tipo);
});

// =========================
// TOAST / MODAL UI
// =========================
function ensureToastContainer() {
  let c = document.querySelector(".toast-container");
  if (!c) {
    c = document.createElement("div");
    c.className = "toast-container";
    document.body.appendChild(c);
  }
  return c;
}

function showToast(type = "success", title = "Listo", message = "", ms = 3500) {
  const container = ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  toast.innerHTML = `
    <div>
      <p class="toast-title">${title}</p>
      ${message ? `<p class="toast-message">${message}</p>` : ""}
    </div>
    <button class="toast-close" aria-label="Cerrar">×</button>
  `;

  const close = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 150);
  };

  toast.querySelector(".toast-close").addEventListener("click", close);
  container.appendChild(toast);

  if (ms > 0) setTimeout(close, ms);
}

function showModal({ title = "Aviso", message = "", buttonText = "Aceptar" } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="toast-close" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">${message}</div>
      <div class="modal-footer">
        <button class="btn btn-primary">${buttonText}</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector(".toast-close").addEventListener("click", close);
  overlay.querySelector(".btn").addEventListener("click", close);

  document.body.appendChild(overlay);
}

// =============================
// HELPER: consultar RFC existente
// =============================
async function checkRfcExists(rfc) {
  const url = `/api/proveedores/existe?rfc=${encodeURIComponent(rfc)}`;
  const resp = await fetch(url, { method: "GET" });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.message || "No se pudo validar el RFC.");
  }
  return Boolean(data?.exists);
}

// =============================
// SUBMIT FORMULARIO
// =============================
function attachSubmitListener() {
  if (!currentForm) return;

  // ✅ evita listeners duplicados si se llama 2 veces sobre el mismo form
  if (currentForm.dataset.submitBound === "1") return;
  currentForm.dataset.submitBound = "1";

  currentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const tipo = tipoSelect.value;

    const submitBtn = currentForm.querySelector('button[type="submit"]');
    const prevText = submitBtn ? submitBtn.textContent : "";

    const restoreButton = () => {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText;
      }
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";
    }

    // Validación rápida
    const errors = validateProveedorForm(tipo, currentForm);
    if (errors.length) {
      markRequiredFields(tipo);
      showToast("warning", "Revisa tu información", errors[0] || "Faltan campos por completar.");
      restoreButton();
      return;
    }

    const formData = new FormData(currentForm);
    formData.append("tipo", tipo);

    try {
      const resp = await fetch("/api/proveedores", {
        method: "POST",
        body: formData,
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error(data);

        if (resp.status === 409 || data?.code === "PROVEEDOR_DUPLICADO") {
          showModal({
            title: "Proveedor ya registrado",
            message:
              "Este RFC ya está dado de alta. Si crees que es un error, contacta al área correspondiente.",
            buttonText: "Entendido",
          });
        } else {
          showToast(
            "error",
            "No se pudo guardar",
            data.message || "Ocurrió un error al guardar el proveedor."
          );
        }

        restoreButton();
        return;
      }

      // ✅ ÉXITO
      showToast("success", "Solicitud enviada", "Te regresaremos al inicio de Alta de Proveedores.", 2500);

      // limpiar
      currentForm.reset();
      tipoSelect.value = "";
      container.innerHTML = "";
      currentForm = null;

      // redirigir (dejamos que el toast se vea un momento)
      setTimeout(() => window.location.assign("/formulario"), 900);

      // ⚠️ no hacemos restoreButton() en éxito porque rediriges
    } catch (error) {
      console.error(error);
      showToast("error", "Error de red", "No se pudo enviar la solicitud. Intenta nuevamente.");
      restoreButton();
    }
  });
}

// =============================
// UPPERCASE LISTENERS
// =============================
function attachUppercaseListeners() {
  if (!currentForm) return;

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
// LIVE VALIDATION (rojo/verde)
// =============================
function attachLiveValidation(tipo) {
  if (!currentForm) return;

  const inputs = currentForm.querySelectorAll("input, select, textarea");

  inputs.forEach((input) => {
    if (input.type === "file") return;

    const handler = () => {
      const state = validateField(tipo, input);
      paintFieldState(input, state);
    };

    input.addEventListener("input", handler);
    input.addEventListener("change", handler);
    input.addEventListener("blur", handler);
  });
}

// =============================
// STEPPER + BLOQUEO RFC DUPLICADO
// =============================
function attachStepper(tipo) {
  if (!currentForm) return;

  const sections = currentForm.querySelectorAll(".form-section");
  const navButtons = currentForm.querySelectorAll(".btn-next-section, .btn-prev-section");

  sections.forEach((sec, idx) => {
    sec.style.display = idx === 0 ? "block" : "none";
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();

      const nextId = btn.getAttribute("data-next");
      const prevId = btn.getAttribute("data-prev");

      // =============================
      // AVANZAR
      // =============================
      if (nextId) {
        const target = currentForm.querySelector(`.form-section[data-section-id="${nextId}"]`);
        if (!target) return;

        // Validación visual sección actual
        markRequiredFields(tipo);

        const visibleSection = Array.from(sections).find((sec) => sec.style.display !== "none");
        const invalidInSection = visibleSection?.querySelector(".input-invalid");
        if (invalidInSection) {
          showToast("warning", "Campos incompletos", "Completa los campos requeridos para continuar.");
          invalidInSection.focus?.();
          return;
        }

        // ✅ Bloqueo por RFC duplicado SOLO al salir del paso 1 (pf-datos / pm-datos)
        const isFirstStep =
          visibleSection?.getAttribute("data-section-id") === "pm-datos" ||
          visibleSection?.getAttribute("data-section-id") === "pf-datos";

        if (isFirstStep) {
          const rfcInput = currentForm.querySelector('input[name="rfc"]');
          const rfc = (rfcInput?.value || "").trim().toUpperCase();

          if (!rfc) {
            if (rfcInput) paintFieldState(rfcInput, "invalid");
            showToast("warning", "RFC requerido", "Ingresa el RFC para continuar.");
            rfcInput?.focus?.();
            return;
          }

          const rfcOk =
            (tipo === "moral" && rfc.length === 12) ||
            (tipo === "fisica" && rfc.length === 13);

          if (!rfcOk) {
            if (rfcInput) paintFieldState(rfcInput, "invalid");
            showToast(
              "warning",
              "RFC inválido",
              tipo === "moral"
                ? "El RFC de persona moral debe tener 12 caracteres."
                : "El RFC de persona física debe tener 13 caracteres."
            );
            rfcInput?.focus?.();
            return;
          }

          const oldText = btn.textContent;
          btn.disabled = true;
          btn.textContent = "Validando...";

          try {
            const exists = await checkRfcExists(rfc);

            if (exists) {
              if (rfcInput) {
                paintFieldState(rfcInput, "invalid");
                rfcInput.focus?.();
              }
              showModal({
                title: "Proveedor ya registrado",
                message:
                  "Este RFC ya está dado de alta. Si crees que es un error, contacta al área correspondiente.",
                buttonText: "Entendido",
              });
              return;
            }

            if (rfcInput) paintFieldState(rfcInput, "valid");
          } catch (err) {
            console.error(err);
            showToast("error", "No se pudo validar RFC", "Intenta nuevamente en unos segundos.");
            return;
          } finally {
            btn.disabled = false;
            btn.textContent = oldText;
          }
        }

        // Avanzar
        sections.forEach((s) => (s.style.display = "none"));
        target.style.display = "block";
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      // =============================
      // REGRESAR
      // =============================
      if (prevId) {
        const target = currentForm.querySelector(`.form-section[data-section-id="${prevId}"]`);
        if (!target) return;

        sections.forEach((s) => (s.style.display = "none"));
        target.style.display = "block";
        target.scrollIntoView({ behavior: "smooth", block: "start" });
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

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isOnlyDigits(str) {
  return /^\d+$/.test(str);
}

// Valida un solo campo y devuelve "valid" | "invalid" | "none"
function validateField(tipo, input) {
  if (input.type === "file") return "none";

  const name = input.name;
  const value = (input.value || "").trim();

  if (input.required && !value) return "invalid";
  if (!input.required && !value) return "none";

  if (name === "rfc") {
    return tipo === "moral"
      ? value.length === 12
        ? "valid"
        : "invalid"
      : value.length === 13
      ? "valid"
      : "invalid";
  }

  if (name === "curp") return value.length === 18 ? "valid" : "invalid";
  if (name === "repRfc") return value.length === 13 ? "valid" : "invalid";
  if (name === "repCurp") return value.length === 18 ? "valid" : "invalid";
  if (name === "email") return isEmailValid(value) ? "valid" : "invalid";

  if (name === "telefono") {
    const digits = value.replace(/\s+/g, "");
    if (!isOnlyDigits(digits)) return "invalid";
    return digits.length >= 10 && digits.length <= 15 ? "valid" : "invalid";
  }

  if (name === "cp" || name === "repCp") {
    const digits = value.replace(/\s+/g, "");
    if (!isOnlyDigits(digits)) return "invalid";
    return digits.length === 5 ? "valid" : "invalid";
  }

  if (name === "clabe") {
    const digits = value.replace(/\s+/g, "");
    if (!isOnlyDigits(digits)) return "invalid";
    return digits.length === 18 ? "valid" : "invalid";
  }

  if (name === "cuenta") {
    const digits = value.replace(/\s+/g, "");
    if (!isOnlyDigits(digits)) return "invalid";
    return digits.length >= 6 ? "valid" : "invalid";
  }

  return input.required ? "valid" : "none";
}

// =============================
// VALIDACIÓN DE FORM COMPLETO
// =============================
function validateProveedorForm(tipo, form) {
  const errors = [];
  if (!form) return ["Formulario no encontrado."];

  // 1) Validar inputs requeridos NO file (texto/select/etc.)
  const requiredNonFile = form.querySelectorAll("input[required], select[required], textarea[required]");
  requiredNonFile.forEach((el) => {
    if (el.type === "file") return;

    const value = (el.value || "").trim();
    if (!value) {
      errors.push(`El campo "${prettyName(el.name)}" es obligatorio.`);
      return;
    }

    // reglas extra usando tu validateField
    const state = validateField(tipo, el);
    if (state === "invalid") {
      errors.push(`El campo "${prettyName(el.name)}" es inválido.`);
    }
  });

  // 2) Validar FILES requeridos (PDF)
  const requiredFiles = form.querySelectorAll('input[type="file"][required]');
  requiredFiles.forEach((el) => {
    const file = el.files && el.files[0];
    if (!file) {
      errors.push(`Debes adjuntar "${prettyName(el.name)}".`);
      return;
    }

    // Fuerza PDF por MIME o extensión (por si el navegador no manda bien MIME)
    const isPdf =
      file.type === "application/pdf" || (file.name || "").toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      errors.push(`El archivo "${prettyName(el.name)}" debe ser PDF.`);
    }
  });

  // 3) Reglas específicas de RFC por tipo (ya lo haces en validateField, pero reforzamos)
  const rfc = (form.querySelector('input[name="rfc"]')?.value || "").trim().toUpperCase();
  if (rfc) {
    const ok = (tipo === "moral" && rfc.length === 12) || (tipo === "fisica" && rfc.length === 13);
    if (!ok) errors.push("RFC inválido para el tipo de proveedor.");
  }

  return errors;
}

function prettyName(name) {
  // Puedes mapear nombres técnicos a algo más bonito si quieres
  const map = {
    razonSocial: "Razón social",
    apellidoPaterno: "Apellido paterno",
    nombre: "Nombre",
    rfc: "RFC",
    curp: "CURP",
    email: "Email",
    telefono: "Teléfono",
    cp: "Código postal",
    clabe: "CLABE",
    cuenta: "Número de cuenta",
    // docs (ejemplos)
    docPmActaConstitutiva: "Acta constitutiva",
    docPmIdentificacionRep: "Identificación del representante",
  };
  return map[name] || name || "campo";
}

function paintFieldState(input, state) {
  input.classList.remove("input-valid", "input-invalid");
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

          <label>Ocupación (opcional):</label>
          <input type="text" name="ocupacion"/>

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

      <!-- Sección 5: Documentos (PDF) -->
      <div class="form-section" data-section-id="pf-documentos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">5</span>
            <h3>Documentos (PDF)</h3>
          </div>
        </div>

        <div class="form-section-body">

          <h4>Segmento 1: Documentos fiscales básicos (obligatorios)</h4>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Identificación oficial (INE / Pasaporte) (PDF):</label>
              <input type="file" name="docPfIdentificacion" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Constancia de situación fiscal (PDF):</label>
              <input type="file" name="docPfConstanciaFiscal" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Comprobante de domicilio fiscal (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPfDomicilioFiscal" accept="application/pdf" required />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 2: Bancario y SAT (obligatorios)</h4>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Carátula de estado de cuenta bancario (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPfCaratulaBanco" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Constancia de cumplimiento fiscal - SAT (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPfCumplimientoSAT" accept="application/pdf" required />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 3: Documentos opcionales</h4>
          <p class="field-hint">Todos los documentos de este segmento son opcionales.</p>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Constancia de cumplimiento - IMSS (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPfCumplimientoIMSS" accept="application/pdf" />
            </div>

            <!-- ⚠️ Si INFONAVIT es obligatorio, muévelo a segmento 2 y pon required -->
            <div class="docs-item">
              <label>Constancia de cumplimiento - INFONAVIT (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPfCumplimientoINFONAVIT" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Registro patronal (PDF):</label>
              <input type="file" name="docPfRegistroPatronal" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Portafolio de proyectos y/o experiencia previa (PDF):</label>
              <input type="file" name="docPfPortafolio" accept="application/pdf" />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 4: Documentos adicionales si aplica REPSE</h4>
          <p class="field-hint">Aplica solo si se prestan servicios especializados.</p>
          <div class="docs-grid">
            <div class="docs-item">
              <label>REPSE (Registro de Prestadoras de Servicios Especializados) (PDF):</label>
              <input type="file" name="docPfREPSE" accept="application/pdf" />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 5: Documentación adicional obligatoria si aplica REPSE</h4>
          <p class="field-hint">Todos los documentos de este apartado son opcionales (solo si aplica REPSE).</p>
          <div class="docs-grid">
            <div class="docs-item">
              <label>CFDIs de nómina (PDF):</label>
              <input type="file" name="docPfCfdisNomina" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Declaraciones y pagos - IMSS (PDF):</label>
              <input type="file" name="docPfDeclaracionesPagosIMSS" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Declaraciones y pagos - INFONAVIT (PDF):</label>
              <input type="file" name="docPfDeclaracionesPagosINFONAVIT" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Declaraciones y pagos - Impuestos federales (PDF):</label>
              <input type="file" name="docPfDeclaracionesPagosFederales" accept="application/pdf" />
            </div>
          </div>

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
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-acta">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 5: Acta constitutiva -->
      <div class="form-section" data-section-id="pm-acta">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">5</span>
            <h3>Acta constitutiva</h3>
          </div>
        </div>

        <div class="form-section-body">
          <label>Número de escritura o instrumento:</label>
          <input type="text" name="actaNumEscritura" required />

          <label>Fecha de constitución (acta):</label>
          <input type="date" name="actaFechaConstitucion" required />

          <label>Apellido paterno del notario:</label>
          <input type="text" name="actaNotarioApellidoPaterno" required />

          <label>Apellido materno del notario (opcional):</label>
          <input type="text" name="actaNotarioApellidoMaterno" />

          <label>Nombre del notario:</label>
          <input type="text" name="actaNotarioNombre" required />

          <label>Nombres del notario (opcional):</label>
          <input type="text" name="actaNotarioOtrosNombres" />

          <label>Número de notaría:</label>
          <input type="text" name="actaNumNotaria" required />

          <label>Estado o entidad federativa (notaría):</label>
          <input type="text" name="actaNotarioEstado" required />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pm-bancario">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-representante">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 6: Datos del Representante Legal -->
      <div class="form-section" data-section-id="pm-representante">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">6</span>
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

          <label>Ocupación (opcional):</label>
          <input type="text" name ="repOcupacion" />

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-prev-section" data-prev="pm-acta">
              Atrás
            </button>
            <button type="button" class="btn btn-primary btn-next-section" data-next="pm-documentos">
              Guardar y continuar
            </button>
          </div>
        </div>
      </div>

      <!-- Sección 7: Documentos (PDF) -->
      <div class="form-section" data-section-id="pm-documentos">
        <div class="form-section-header">
          <div class="form-section-title">
            <span class="step-badge">7</span>
            <h3>Documentos (PDF)</h3>
          </div>
        </div>

        <div class="form-section-body">
          <h4>Segmento 1: Documentos fiscales básicos (obligatorios)</h4>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Identificación oficial del representante legal (INE / Pasaporte) (PDF):</label>
              <input type="file" name="docPmIdentificacionRep" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Constancia de situación fiscal (Persona moral) (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPmConstanciaFiscalEmpresa" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Constancia de situación fiscal (Representante legal) (PDF):</label>
              <input type="file" name="docPmConstanciaFiscalRep" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Comprobante de domicilio fiscal (Persona moral) (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPmDomicilioFiscalEmpresa" accept="application/pdf" required />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 2: Constitución y representación</h4>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Acta constitutiva y/o última protocolización (PDF):</label>
              <input type="file" name="docPmActaConstitutiva" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Poder del representante legal (PDF):</label>
              <small class="field-hint">Opcional si no aparece en el acta constitutiva</small>
              <input type="file" name="docPmPoderRepresentante" accept="application/pdf" />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 3: Bancario y SAT (obligatorios)</h4>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Carátula de estado de cuenta bancario (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPmCaratulaBanco" accept="application/pdf" required />
            </div>

            <div class="docs-item">
              <label>Constancia de cumplimiento fiscal - SAT (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPmCumplimientoSAT" accept="application/pdf" required />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 4: Documentos opcionales</h4>
          <p class="field-hint">Todos los documentos de este segmento son opcionales.</p>
          <div class="docs-grid">
            <div class="docs-item">
              <label>Constancia de cumplimiento - IMSS (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPmCumplimientoIMSS" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Constancia de cumplimiento - INFONAVIT (PDF):</label>
              <small class="field-hint">Fecha no mayor a 1 mes</small>
              <input type="file" name="docPmCumplimientoINFONAVIT" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>REPSE (Registro de Prestadoras de Servicios Especializados) (PDF):</label>
              <small class="field-hint">Aplica solo si se prestan servicios especializados</small>
              <input type="file" name="docPmREPSE" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Registro patronal (PDF):</label>
              <input type="file" name="docPmRegistroPatronal" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Estados financieros (Último ejercicio fiscal) (PDF):</label>
              <input type="file" name="docPmEstadosFinancieros" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Portafolio de proyectos y/o experiencia previa (PDF):</label>
              <input type="file" name="docPmPortafolio" accept="application/pdf" />
            </div>
          </div>

          <hr class="section-divider" />

          <h4>Segmento 5: Documentación adicional obligatoria si aplica REPSE</h4>
          <p class="field-hint">Todos los documentos de este apartado son opcionales.</p>
          <div class="docs-grid">
            <div class="docs-item">
              <label>CFDIs de nómina (PDF):</label>
              <input type="file" name="docPmCfdisNomina" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Declaraciones y pagos - IMSS (PDF):</label>
              <input type="file" name="docPmDeclaracionesPagosIMSS" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Declaraciones y pagos - INFONAVIT (PDF):</label>
              <input type="file" name="docPmDeclaracionesPagosINFONAVIT" accept="application/pdf" />
            </div>

            <div class="docs-item">
              <label>Declaraciones y pagos - Impuestos federales (PDF):</label>
              <input type="file" name="docPmDeclaracionesPagosFederales" accept="application/pdf" />
            </div>
          </div>

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
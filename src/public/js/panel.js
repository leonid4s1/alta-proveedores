// src/public/js/panel.js
document.addEventListener("DOMContentLoaded", () => {
  const tablaBody = document.getElementById("tablaProveedores");
  const filtroEstatus = document.getElementById("filtroEstatus");
  const btnRefrescar = document.getElementById("btnRefrescar");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const pageInfo = document.getElementById("pageInfo");
  const buscador = document.getElementById("buscador");

  let proveedores = [];
  let paginaActual = 1;
  const pageSize = 10;

  // ================================
  // Helpers de nombre / RFC
  // ================================
  function getNombreProveedor(p) {
    const tipo = p.tipo || "";
    const esMoral = tipo === "moral";

    if (esMoral) {
      return (p.datosGenerales?.razonSocial || "").trim();
    }

    return (
      [
        p.datosGenerales?.apellidoPaterno || "",
        p.datosGenerales?.apellidoMaterno || "",
        p.datosGenerales?.nombre || "",
      ]
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() || ""
    );
  }

  function getRfcProveedor(p) {
    return p.datosGenerales?.rfc || "";
  }

  // ================================
  // CARGAR PROVEEDORES
  // ================================
  async function cargarProveedores() {
    try {
      const resp = await fetch("/api/proveedores");
      const data = await resp.json();

      if (!resp.ok) {
        console.error(data);
        alert(data.message || "Error al cargar los proveedores.");
        return;
      }

      proveedores = data.proveedores || [];
      paginaActual = 1; // reset al cargar
      renderTabla();
    } catch (error) {
      console.error(error);
      alert("Error de red al cargar los proveedores.");
    }
  }

  // ================================
  // RENDER TABLA + PAGINACIÓN
  // ================================
  function renderTabla() {
    const estatusFiltro = filtroEstatus.value;
    const query = (buscador.value || "").trim().toLowerCase();
    tablaBody.innerHTML = "";

    // 1) Filtrar por estatus
    let listaFiltrada =
      estatusFiltro && estatusFiltro !== "todos"
        ? proveedores.filter((p) => p.estatus === estatusFiltro)
        : proveedores.slice();

    // 2) Filtrar por buscador (RFC o Nombre/Razón Social)
    if (query) {
      listaFiltrada = listaFiltrada.filter((p) => {
        const nombre = getNombreProveedor(p).toLowerCase();
        const rfc = getRfcProveedor(p).toLowerCase();
        return nombre.includes(query) || rfc.includes(query);
      });
    }

    if (listaFiltrada.length === 0) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No hay proveedores para mostrar.</td>
        </tr>
      `;
      pageInfo.textContent = "Página 0 de 0";
      btnPrev.disabled = true;
      btnNext.disabled = true;
      return;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(listaFiltrada.length / pageSize)
    );

    // Aseguramos que la página actual esté dentro de los límites
    if (paginaActual > totalPages) paginaActual = totalPages;
    if (paginaActual < 1) paginaActual = 1;

    const start = (paginaActual - 1) * pageSize;
    const end = start + pageSize;
    const pagina = listaFiltrada.slice(start, end);

    // Info de página
    pageInfo.textContent = `Página ${paginaActual} de ${totalPages}`;
    btnPrev.disabled = paginaActual === 1;
    btnNext.disabled = paginaActual === totalPages;

    // Render de la página actual
    pagina.forEach((p) => {
      const tr = document.createElement("tr");

      const tipo = p.tipo || "";
      const nombre = getNombreProveedor(p);
      const rfc = getRfcProveedor(p);
      const estatus = p.estatus || "pendiente_revision";
      const creadoEn = p.creadoEn ? formatearFecha(p.creadoEn) : "";
      const id = p.id || "";

      tr.innerHTML = `
        <td>${tipo}</td>
        <td>${nombre}</td>
        <td>${rfc}</td>
        <td>
          <span class="status-pill status-${estatus}">
            ${mapEstatusTexto(estatus)}
          </span>
        </td>
        <td>${creadoEn}</td>
        <td>
          <div class="acciones">
            <select data-id="${id}" class="select-status">
              <option value="pendiente_revision" ${
                estatus === "pendiente_revision" ? "selected" : ""
              }>Pendiente</option>
              <option value="aprobado" ${
                estatus === "aprobado" ? "selected" : ""
              }>Aprobado</option>
              <option value="rechazado" ${
                estatus === "rechazado" ? "selected" : ""
              }>Rechazado</option>
            </select>

            <button class="btn btn-primary btn-sm btn-guardar-estatus" data-id="${id}">
              Guardar
            </button>

            ${
              p.driveFolderId
                ? `<button class="btn btn-sm btn-ver-drive" data-folder="${p.driveFolderId}">
                    Ver en carpeta
                  </button>`
                : ""
            }

            <button class="btn btn-sm btn-eliminar" data-id="${id}">
              Eliminar
            </button>

            <button class="btn btn-sm btn-pdf" data-id="${id}">
              Hoja PDF
            </button>
          </div>
        </td>
      `;

      tablaBody.appendChild(tr);
    });

    // Eventos de acciones después de renderizar
    document
      .querySelectorAll(".btn-guardar-estatus")
      .forEach((btn) => btn.addEventListener("click", onGuardarEstatusClick));

    document
      .querySelectorAll(".btn-ver-drive")
      .forEach((btn) => btn.addEventListener("click", onVerDriveClick));

    document
      .querySelectorAll(".btn-eliminar")
      .forEach((btn) => btn.addEventListener("click", onEliminarClick));

    document
      .querySelectorAll(".btn-pdf")
      .forEach((btn) => btn.addEventListener("click", onPdfClick));
  }

  function mapEstatusTexto(estatus) {
    switch (estatus) {
      case "pendiente_revision":
        return "Pendiente de Revisión";
      case "aprobado":
        return "Aprobado";
      case "rechazado":
        return "Rechazado";
      default:
        return estatus;
    }
  }

  // Manejar Timestamp de Firestore ({ _seconds, _nanoseconds }) o ISO string
  function formatearFecha(fechaFirestore) {
    try {
      if (
        fechaFirestore &&
        typeof fechaFirestore === "object" &&
        "_seconds" in fechaFirestore
      ) {
        const d = new Date(fechaFirestore._seconds * 1000);
        return d.toLocaleString("es-MX");
      }
      const d = new Date(fechaFirestore);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("es-MX");
      }
    } catch (e) {
      console.error("Error formateando fecha:", e);
    }
    return "";
  }

  // ================================
  // ACTUALIZAR ESTATUS
  // ================================
  async function onGuardarEstatusClick(event) {
    const id = event.target.getAttribute("data-id");
    const select = document.querySelector(`.select-status[data-id="${id}"]`);
    if (!id || !select) return;

    const nuevoEstatus = select.value;

    if (
      !confirm(
        `¿Cambiar estatus de este proveedor a "${mapEstatusTexto(
          nuevoEstatus
        )}"?`
      )
    ) {
      return;
    }

    try {
      const resp = await fetch(`/api/proveedores/${id}/estatus`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estatus: nuevoEstatus }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error(data);
        alert(data.message || "Error al actualizar el estatus.");
        return;
      }

      alert("Estatus actualizado correctamente.");

      // Actualizar localmente y re-renderizar
      const idx = proveedores.findIndex((p) => p.id === id);
      if (idx !== -1 && data.proveedor) {
        proveedores[idx] = data.proveedor;
      }
      renderTabla();
    } catch (error) {
      console.error(error);
      alert("Error de red al actualizar el estatus.");
    }
  }

  // ================================
  // ELIMINAR PROVEEDOR
  // ================================
  async function onEliminarClick(event) {
    const id = event.target.getAttribute("data-id");
    if (!id) return;

    if (
      !confirm(
        "¿Estás seguro de eliminar este proveedor? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const resp = await fetch(`/api/proveedores/${id}`, {
        method: "DELETE",
      });

      const data = await resp.json();

      if (!resp.ok) {
        console.error(data);
        alert(data.message || "Error al eliminar el proveedor.");
        return;
      }

      alert("Proveedor eliminado correctamente.");

      // Borrar de la lista local y re-renderizar
      proveedores = proveedores.filter((p) => p.id !== id);
      renderTabla();
    } catch (error) {
      console.error(error);
      alert("Error de red al eliminar el proveedor.");
    }
  }

  // ================================
  // VER CARPETA DE DRIVE
  // ================================
  function onVerDriveClick(event) {
    const folderId = event.target.getAttribute("data-folder");
    if (!folderId) return;

    const url = `https://drive.google.com/drive/folders/${folderId}`;
    window.open(url, "_blank");
  }

  // ================================
  // VER PDF (HOJA DE REGISTRO)
  // ================================
  function onPdfClick(event) {
    const id = event.target.getAttribute("data-id");
    if (!id) return;
    const url = `/api/proveedores/${id}/hoja`;
    window.open(url, "_blank");
  }

  // ================================
  // EVENTOS GLOBALES
  // ================================
  filtroEstatus.addEventListener("change", () => {
    paginaActual = 1;
    renderTabla();
  });

  buscador.addEventListener("input", () => {
    paginaActual = 1;
    renderTabla();
  });

  btnRefrescar.addEventListener("click", cargarProveedores);

  btnPrev.addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      renderTabla();
    }
  });

  btnNext.addEventListener("click", () => {
    paginaActual++;
    renderTabla();
  });

  // Cargar al entrar
  cargarProveedores();
});

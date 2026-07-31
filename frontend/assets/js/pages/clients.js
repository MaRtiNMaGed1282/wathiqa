"use strict";

(function (global) {
  const ROUTES = Object.freeze({
    CLIENT_PROFILE: "client-profile.html",
  });

  const CONFIG = Object.freeze({
    clientsEndpoint: "/clients",
    searchEndpoint: "/clients/search",
    toastDuration: 2500,
    deleteConfirmText: "سيتم حذف الموكل نهائياً",
    deleteConfirmTitle: "تأكيد الحذف",
    addSuccessMessage: "تم إضافة الموكل بنجاح",
    editSuccessMessage: "تم تعديل بيانات الموكل بنجاح",
    addErrorMessage: "حدث خطأ أثناء إضافة الموكل",
    editErrorMessage: "حدث خطأ أثناء التعديل",
    deleteErrorMessage: "حدث خطأ أثناء الحذف",
    loadClientErrorMessage: "فشل تحميل بيانات الموكل",
    fetchClientsErrorMessage: "Failed to fetch clients:",
    searchErrorMessage: "Search Error:",
    emptyClientsMessage: "لا يوجد موكلون",
    nationalIdLength: 14,
    exportFilename: "clients.xlsx",
    dateLocale: "ar-EG",
  });

  const state = {
    loading: false,
    initialized: false,
    abortController: null,
    currentClientId: null,
    currentClients: [],
    timers: [],
    elements: Object.seal({
      totalClients: null,
      latestClient: null,
      searchInput: null,
      openAddClientButton: null,
      exportClientsButton: null,
      clientsTableBody: null,
      addClientForm: null,
      addClientModal: null,
      closeAddClientModalButton: null,
      editModal: null,
      closeEditModalButton: null,
      saveEditBtn: null,
      fullName: null,
      clientCode: null,
      nationalId: null,
      phone: null,
      address: null,
      notes: null,
      attorneyNumber: null,
      attorneyType: null,
      issuingOffice: null,
      attorneyFile: null,
      editFullName: null,
      editClientCode: null,
      editNationalId: null,
      editPhone: null,
      editAddress: null,
      editNotes: null,
    }),
  };

  Object.seal(state);

  /* -------------------------------------------------------------------------- */
  /*                                DOM HELPERS                                 */
  /* -------------------------------------------------------------------------- */

  function getRequiredElement(id) {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`Missing required element: ${id}`);
    }

    return element;
  }

  function cacheElements() {
    state.elements.totalClients = getRequiredElement("totalClients");
    state.elements.latestClient = getRequiredElement("latestClient");
    state.elements.searchInput = getRequiredElement("searchInput");
    state.elements.openAddClientButton = getRequiredElement(
      "openAddClientButton",
    );
    state.elements.exportClientsButton = getRequiredElement(
      "exportClientsButton",
    );
    state.elements.clientsTableBody = getRequiredElement("clientsTableBody");
    state.elements.addClientForm = getRequiredElement("addClientForm");
    state.elements.addClientModal = getRequiredElement("addClientModal");
    state.elements.closeAddClientModalButton = getRequiredElement(
      "closeAddClientModalButton",
    );
    state.elements.editModal = getRequiredElement("editModal");
    state.elements.closeEditModalButton = getRequiredElement(
      "closeEditModalButton",
    );
    state.elements.saveEditBtn = getRequiredElement("saveEditBtn");

    state.elements.fullName = getRequiredElement("full_name");
    state.elements.clientCode = getRequiredElement("client_code");
    state.elements.nationalId = getRequiredElement("national_id");
    state.elements.phone = getRequiredElement("phone");
    state.elements.address = getRequiredElement("address");
    state.elements.notes = getRequiredElement("notes");
    state.elements.attorneyNumber = getRequiredElement("attorney_number");
    state.elements.attorneyType = getRequiredElement("attorney_type");
    state.elements.issuingOffice = getRequiredElement("issuing_office");
    state.elements.attorneyFile = getRequiredElement("attorney_file");

    state.elements.editFullName = getRequiredElement("edit_full_name");
    state.elements.editClientCode = getRequiredElement("edit_client_code");
    state.elements.editNationalId = getRequiredElement("edit_national_id");
    state.elements.editPhone = getRequiredElement("edit_phone");
    state.elements.editAddress = getRequiredElement("edit_address");
    state.elements.editNotes = getRequiredElement("edit_notes");
  }

  function clearElementReferences() {
    Object.keys(state.elements).forEach((key) => {
      state.elements[key] = null;
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                  HELPERS                                   */
  /* -------------------------------------------------------------------------- */

  function abortRequest() {
    if (!state.abortController) {
      return;
    }

    state.abortController.abort();
    state.abortController = null;
  }

  function createAbortController() {
    abortRequest();

    const controller = new AbortController();

    state.abortController = controller;

    return controller;
  }

  function registerTimer(timerId) {
    state.timers.push(timerId);

    return timerId;
  }

  function clearTimers() {
    while (state.timers.length > 0) {
      const timerId = state.timers.pop();
      clearTimeout(timerId);
    }
  }

  function removeTimer(timerId) {
    const index = state.timers.indexOf(timerId);

    if (index >= 0) {
      state.timers.splice(index, 1);
    }
  }

  function showToast(message, success = true, duration = CONFIG.toastDuration) {
    Toastify({
      text: message,
      duration,
      gravity: "top",
      position: "left",
      close: true,
      stopOnFocus: true,
      style: {
        background: success ? "#16a34a" : "#dc2626",
      },
    }).showToast();

    const timerId = registerTimer(
      setTimeout(() => {
        removeTimer(timerId);
      }, duration),
    );
  }

  function createTextCell(text, className = "p-2") {
    const cell = document.createElement("td");

    cell.className = className;
    cell.textContent = text;

    return cell;
  }

  function createButton(text, className, action, dataset = {}) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.dataset.action = action;

    Object.entries(dataset).forEach(([key, value]) => {
      button.dataset[key] = value;
    });

    return button;
  }

  function getClientProfileUrl(id) {
    return `${ROUTES.CLIENT_PROFILE}?id=${encodeURIComponent(id)}`;
  }

  function buildClientExportRows(clients) {
    return clients.map((client) => ({
      الاسم: client.full_name,
      "الرقم القومي": client.national_id,
      الهاتف: client.phone,
      العنوان: client.address,
      الملاحظات: client.notes || "",
      "تاريخ الإضافة": new Date(client.created_at).toLocaleDateString(
        CONFIG.dateLocale,
      ),
    }));
  }

  function showNotes(notes) {
    const content = document.createElement("div");

    content.style.textAlign = "right";
    content.style.fontSize = "16px";
    content.style.lineHeight = "1.8";
    content.style.whiteSpace = "pre-wrap";
    content.textContent = notes || "لا توجد ملاحظات";

    return Swal.fire({
      title: "ملاحظات الموكل",
      html: content.outerHTML,
      width: "700px",
      confirmButtonText: "إغلاق",
    });
  }

  function validateClientData(clientData) {
    if (!clientData.full_name) {
      return "يرجى إدخال اسم الموكل";
    }

    if (!clientData.national_id) {
      return "يرجى إدخال الرقم القومي";
    }

    if (
      !new RegExp(`^\\d{${CONFIG.nationalIdLength}}$`).test(
        clientData.national_id,
      )
    ) {
      return `يجب أن يتكون الرقم القومي من ${CONFIG.nationalIdLength} رقم`;
    }

    if (!clientData.phone) {
      return "يرجى إدخال رقم الهاتف";
    }

    if (!clientData.address) {
      return "يرجى إدخال العنوان";
    }

    return null;
  }

  function buildClientFormData(clientData) {
    const formData = new FormData();

    formData.append("full_name", clientData.full_name);
    formData.append("client_code", clientData.client_code);
    formData.append("national_id", clientData.national_id);
    formData.append("phone", clientData.phone);
    formData.append("address", clientData.address);
    formData.append("notes", clientData.notes);
    formData.append("attorney_number", clientData.attorney_number);
    formData.append("attorney_type", clientData.attorney_type);
    formData.append("issuing_office", clientData.issuing_office);

    const file = state.elements.attorneyFile.files[0];

    if (file) {
      formData.append("attorney_file", file);
    }

    return formData;
  }

  function collectClientFormData() {
    return {
      full_name: state.elements.fullName.value.trim(),
      client_code: state.elements.clientCode.value.trim(),
      national_id: state.elements.nationalId.value.trim(),
      phone: state.elements.phone.value.trim(),
      address: state.elements.address.value.trim(),
      notes: state.elements.notes.value.trim(),
      attorney_number: state.elements.attorneyNumber.value.trim(),
      attorney_type: state.elements.attorneyType.value.trim(),
      issuing_office: state.elements.issuingOffice.value.trim(),
    };
  }

  function collectEditFormData() {
    return {
      full_name: state.elements.editFullName.value,
      client_code: state.elements.editClientCode.value,
      national_id: state.elements.editNationalId.value,
      phone: state.elements.editPhone.value,
      address: state.elements.editAddress.value,
      notes: state.elements.editNotes.value,
    };
  }

  function exportClients() {
    const exportData = buildClientExportRows(state.currentClients);

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, CONFIG.exportFilename);
  }

  function openProfile(id) {
    global.location.href = getClientProfileUrl(id);
  }

  /* -------------------------------------------------------------------------- */
  /*                                     API                                    */
  /* -------------------------------------------------------------------------- */

  async function fetchClients() {
    const controller = createAbortController();

    try {
      return await api.get(CONFIG.clientsEndpoint, {
        signal: controller.signal,
      });
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  async function searchClients(query) {
    const controller = createAbortController();

    try {
      return await api.get(
        `${CONFIG.searchEndpoint}?q=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
        },
      );
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  async function fetchClientById(id) {
    const controller = createAbortController();

    try {
      return await api.get(`${CONFIG.clientsEndpoint}/${id}`, {
        signal: controller.signal,
      });
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  async function createClient(formData) {
    const controller = createAbortController();

    try {
      return await api.upload(CONFIG.clientsEndpoint, formData, {
        signal: controller.signal,
      });
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  async function updateClient(id, payload) {
    const controller = createAbortController();

    try {
      return await api.put(`${CONFIG.clientsEndpoint}/${id}`, payload, {
        signal: controller.signal,
      });
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  async function deleteClient(id) {
    const controller = createAbortController();

    try {
      return await api.delete(`${CONFIG.clientsEndpoint}/${id}`, {
        signal: controller.signal,
      });
    } finally {
      if (state.abortController === controller) {
        state.abortController = null;
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  RENDERERS                                 */
  /* -------------------------------------------------------------------------- */

  function renderSummary(data) {
    state.elements.totalClients.textContent = String(data.length);

    if (data.length > 0) {
      state.elements.latestClient.textContent = data[0].full_name;
    } else {
      state.elements.latestClient.textContent = "---";
    }
  }

  function renderEmptyClientsTable() {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 8;
    cell.className = "text-center py-8 text-gray-500";
    cell.textContent = CONFIG.emptyClientsMessage;

    row.appendChild(cell);
    state.elements.clientsTableBody.appendChild(row);
  }

  function renderClients(data) {
    state.elements.clientsTableBody.replaceChildren();

    if (data.length === 0) {
      renderEmptyClientsTable();
      return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((client, index) => {
      const row = document.createElement("tr");
      row.className = "border-b hover:bg-gray-50";

      row.appendChild(createTextCell(String(index + 1)));
      row.appendChild(createTextCell(client.full_name));
      row.appendChild(createTextCell(client.national_id));
      row.appendChild(createTextCell(client.phone));
      row.appendChild(createTextCell(client.address));

      const notesCell = document.createElement("td");
      notesCell.className = "p-2";

      const notesActions = document.createElement("div");

      const profileButton = createButton(
        "الملف",
        "bg-primary text-white px-3 py-1 rounded",
        "open-profile",
        {
          clientId: String(client.id),
        },
      );

      const notesButton = createButton(
        "عرض",
        "bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700",
        "view-notes",
        {
          notes: client.notes || "",
        },
      );

      notesActions.append(profileButton, notesButton);
      notesCell.appendChild(notesActions);
      row.appendChild(notesCell);

      row.appendChild(
        createTextCell(
          new Date(client.created_at).toLocaleDateString(CONFIG.dateLocale),
        ),
      );

      const actionsCell = document.createElement("td");
      actionsCell.className = "p-2";

      const actions = document.createElement("div");
      actions.className = "flex gap-2";

      actions.append(
        createButton(
          "تعديل",
          "bg-accent text-white px-3 py-1 rounded hover:opacity-90",
          "edit-client",
          { clientId: String(client.id) },
        ),
        createButton(
          "حذف",
          "bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700",
          "delete-client",
          { clientId: String(client.id) },
        ),
      );

      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);

      fragment.appendChild(row);
    });

    state.elements.clientsTableBody.appendChild(fragment);
  }

  function renderEditClientForm(client) {
    state.currentClientId = client.id;

    state.elements.editFullName.value = client.full_name || "";
    state.elements.editClientCode.value = client.client_code || "";
    state.elements.editNationalId.value = client.national_id || "";
    state.elements.editPhone.value = client.phone || "";
    state.elements.editAddress.value = client.address || "";
    state.elements.editNotes.value = client.notes || "";
  }

  /* -------------------------------------------------------------------------- */
  /*                                   LAYOUT                                   */
  /* -------------------------------------------------------------------------- */

  function openAddClientModal() {
    state.elements.addClientModal.classList.remove("hidden");
    state.elements.addClientModal.classList.add("flex");
  }

  function closeAddClientModal() {
    state.elements.addClientModal.classList.add("hidden");
    state.elements.addClientModal.classList.remove("flex");
  }

  function openEditModal() {
    state.elements.editModal.classList.remove("hidden");
    state.elements.editModal.classList.add("flex");
  }

  function closeEditModal() {
    state.elements.editModal.classList.add("hidden");
    state.elements.editModal.classList.remove("flex");
  }

  function resetAddForm() {
    state.elements.addClientForm.reset();
  }

  function resetEditForm() {
    state.currentClientId = null;
    state.elements.editFullName.value = "";
    state.elements.editClientCode.value = "";
    state.elements.editNationalId.value = "";
    state.elements.editPhone.value = "";
    state.elements.editAddress.value = "";
    state.elements.editNotes.value = "";
  }

  function updateClientsView(data) {
    state.currentClients = data;
    renderClients(data);
    renderSummary(data);
  }

  /* -------------------------------------------------------------------------- */
  /*                                 CONTROLLER                                 */
  /* -------------------------------------------------------------------------- */

  function detachEvents() {
    state.elements.searchInput.removeEventListener("input", handleSearchInput);
    state.elements.openAddClientButton.removeEventListener(
      "click",
      handleOpenAddClientClick,
    );
    state.elements.exportClientsButton.removeEventListener(
      "click",
      handleExportClientsClick,
    );
    state.elements.closeAddClientModalButton.removeEventListener(
      "click",
      handleCloseAddClientClick,
    );
    state.elements.closeEditModalButton.removeEventListener(
      "click",
      handleCloseEditClientClick,
    );
    state.elements.clientsTableBody.removeEventListener(
      "click",
      handleTableClick,
    );
    state.elements.addClientForm.removeEventListener(
      "submit",
      handleAddClientSubmit,
    );
    state.elements.saveEditBtn.removeEventListener(
      "click",
      handleSaveEditClick,
    );
  }

  function attachEvents() {
    state.elements.searchInput.addEventListener("input", handleSearchInput);
    state.elements.openAddClientButton.addEventListener(
      "click",
      handleOpenAddClientClick,
    );
    state.elements.exportClientsButton.addEventListener(
      "click",
      handleExportClientsClick,
    );
    state.elements.closeAddClientModalButton.addEventListener(
      "click",
      handleCloseAddClientClick,
    );
    state.elements.closeEditModalButton.addEventListener(
      "click",
      handleCloseEditClientClick,
    );
    state.elements.clientsTableBody.addEventListener("click", handleTableClick);
    state.elements.addClientForm.addEventListener(
      "submit",
      handleAddClientSubmit,
    );
    state.elements.saveEditBtn.addEventListener("click", handleSaveEditClick);
  }

  async function loadClients() {
    try {
      const data = await fetchClients();

      updateClientsView(data);
    } catch (err) {
      console.error(CONFIG.fetchClientsErrorMessage, err);
    }
  }

  async function loadSearchResults(query) {
    try {
      const data = await searchClients(query);

      state.currentClients = data;
      renderClients(data);
    } catch (err) {
      console.error(CONFIG.searchErrorMessage, err);
    }
  }

  async function handleSearchInput() {
    const query = state.elements.searchInput.value.trim();

    if (query === "") {
      await loadClients();
      return;
    }

    await loadSearchResults(query);
  }

  function handleOpenAddClientClick() {
    openAddClientModal();
  }

  function handleCloseAddClientClick() {
    closeAddClientModal();
  }

  function handleCloseEditClientClick() {
    closeEditModal();
  }

  function handleExportClientsClick() {
    exportClients();
  }

  async function handleTableClick(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const { action } = button.dataset;

    switch (action) {
      case "open-profile":
        openProfile(button.dataset.clientId);
        break;

      case "view-notes":
        await showNotes(button.dataset.notes);
        break;

      case "edit-client":
        await handleEditClient(button.dataset.clientId);
        break;

      case "delete-client":
        await handleDeleteClient(button.dataset.clientId);
        break;
    }
  }

  async function handleDeleteClient(id) {
    const result = await Swal.fire({
      title: CONFIG.deleteConfirmTitle,
      text: CONFIG.deleteConfirmText,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "حذف",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const data = await deleteClient(id);

      await showToast(data.message, true);
      await loadClients();
    } catch (err) {
      await showToast(CONFIG.deleteErrorMessage, false);
      console.error("Delete Error:", err);
    }
  }

  async function handleEditClient(id) {
    try {
      const client = await fetchClientById(id);

      renderEditClientForm(client);
      openEditModal();
    } catch (err) {
      await showToast(CONFIG.loadClientErrorMessage, false);
      console.error(err);
    }
  }

  async function handleAddClientSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const clientData = collectClientFormData();
      const validationError = validateClientData(clientData);

      if (validationError) {
        await showToast(validationError, false);
        return false;
      }

      const formData = buildClientFormData(clientData);
      const data = await createClient(formData);

      if (data) {
        await showToast(data.message || CONFIG.addSuccessMessage, true);
        await loadClients();
        resetAddForm();
        closeAddClientModal();

        return false;
      }

      return false;
    } catch (error) {
      console.error("Add Client Error:", error);
      await showToast(error.message || CONFIG.addErrorMessage, false);

      return false;
    }
  }

  async function handleSaveEditClick() {
    try {
      const data = await updateClient(
        state.currentClientId,
        collectEditFormData(),
      );

      if (data) {
        await showToast(CONFIG.editSuccessMessage, true);

        closeEditModal();
        resetEditForm();
        await loadClients();
      } else {
        await showToast(data.message || "فشل تعديل بيانات الموكل", false);
      }
    } catch (err) {
      await showToast(CONFIG.editErrorMessage, false);
      console.error(err);
    }
  }

  async function initialize() {
    if (state.loading || state.initialized) {
      return;
    }

    state.loading = true;

    try {
      cacheElements();
      attachEvents();
      await loadClients();
      state.initialized = true;
    } catch (error) {
      console.error("Clients initialization failed.", error);
      throw error;
    } finally {
      state.loading = false;
    }
  }

  function destroy() {
    abortRequest();
    clearTimers();

    if (state.initialized) {
      detachEvents();
    }

    closeAddClientModal();
    closeEditModal();

    state.initialized = false;
    state.loading = false;
    state.currentClientId = null;
    state.currentClients = [];

    state.elements.clientsTableBody?.replaceChildren();

    clearElementReferences();
  }

  /* -------------------------------------------------------------------------- */
  /*                                  PUBLIC API                                */
  /* -------------------------------------------------------------------------- */

  global.Page = Object.freeze({
    initialize,
    destroy,
  });
})(window);

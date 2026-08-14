"use strict";

(function (global) {
  const state = {
    clients: [],
    editingId: null,
    filter: "all",
    query: "",
  };

  const $ = (id) => document.getElementById(id);

  function show(element) {
    element?.classList.remove("hidden");
  }

  function hide(element) {
    element?.classList.add("hidden");
  }

  function message(error, fallback) {
    return error?.body?.message || error?.message || fallback;
  }

  function setLoading(loading) {
    if (loading) {
      show($("loadingState"));
      hide($("errorState"));
      hide($("emptyState"));
      hide($("tableWrap"));
    } else {
      hide($("loadingState"));
    }
  }

  function openModal(client = null) {
    state.editingId = client?.id || null;
    $("modalTitle").textContent = client ? "تعديل بيانات الموكل" : "إضافة موكل";
    $("clientForm").reset();

    if (client) {
      $("full_name").value = client.full_name || "";
      $("client_code").value = client.client_code || "";
      $("national_id").value = client.national_id || "";
      $("phone").value = client.phone || "";
      $("address").value = client.address || "";
      $("notes").value = client.notes || "";
    }

    $("clientModal").classList.remove("hidden");
    $("clientModal").classList.add("flex");
  }

  function closeModal() {
    state.editingId = null;
    $("clientModal").classList.add("hidden");
    $("clientModal").classList.remove("flex");
  }

  function validate(data) {
    if (!data.full_name) return "يرجى إدخال اسم الموكل";
    if (!/^\d{14}$/.test(data.national_id)) return "يجب أن يتكون الرقم القومي من 14 رقم";
    if (!data.phone) return "يرجى إدخال رقم الهاتف";
    if (!data.address) return "يرجى إدخال العنوان";
    return null;
  }

  function render() {
    const body = $("clientsTableBody");
    body.replaceChildren();
    $("totalClients").textContent = String(state.clients.length);

    if (!state.clients.length) {
      hide($("tableWrap"));
      show($("emptyState"));
      return;
    }

    hide($("emptyState"));
    show($("tableWrap"));

    state.clients.forEach((client, index) => {
      const row = document.createElement("tr");
      row.className = "border-b hover:bg-gray-50";

      const values = [
        index + 1,
        client.full_name,
        client.client_code || "-",
        client.national_id,
        client.phone,
        client.address,
        client.created_at ? new Date(client.created_at).toLocaleDateString("ar-EG") : "-",
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.className = "p-3";
        cell.textContent = String(value ?? "");
        row.appendChild(cell);
      });

      const actions = document.createElement("td");
      actions.className = "p-3";
      const wrap = document.createElement("div");
      wrap.className = "flex flex-wrap gap-2";

      const profile = document.createElement("button");
      profile.type = "button";
      profile.className = "bg-primary text-white px-3 py-1 rounded-lg";
      profile.textContent = "الملف";
      profile.onclick = () => {
        global.location.href = `client-profile.html?id=${encodeURIComponent(client.id)}`;
      };

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "bg-blue-600 text-white px-3 py-1 rounded-lg";
      edit.textContent = "تعديل";
      edit.onclick = () => openModal(client);

      wrap.append(profile, edit);

      if (global.permissions?.isAdmin()) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "bg-red-600 text-white px-3 py-1 rounded-lg";
        del.textContent = "حذف";
        del.onclick = () => removeClient(client.id, client.full_name);
        wrap.appendChild(del);
      }

      actions.appendChild(wrap);
      row.appendChild(actions);
      body.appendChild(row);
    });
  }

  async function loadClients() {
    setLoading(true);

    try {
      const params = {
        filter: state.filter,
        q: state.query,
      };

      if (state.filter === "custom") {
        params.startDate = $("startDate").value;
        params.endDate = $("endDate").value;
      }

      const response = await global.api.get("/clients/list", { params });
      state.clients = Array.isArray(response) ? response : response.data || [];
      hide($("errorState"));
      render();
    } catch (error) {
      hide($("tableWrap"));
      hide($("emptyState"));
      $("errorState").textContent = message(error, "فشل تحميل بيانات الموكلين");
      show($("errorState"));
    } finally {
      setLoading(false);
    }
  }

  async function submitClient(event) {
    event.preventDefault();

    const data = {
      full_name: $("full_name").value.trim(),
      client_code: $("client_code").value.trim(),
      national_id: $("national_id").value.trim(),
      phone: $("phone").value.trim(),
      address: $("address").value.trim(),
      notes: $("notes").value.trim(),
      attorney_number: $("attorney_number").value.trim(),
      attorney_type: $("attorney_type").value.trim(),
      issuing_office: $("issuing_office").value.trim(),
    };

    const validationError = validate(data);
    if (validationError) {
      global.ui?.toast(validationError, "error");
      return;
    }

    const button = $("saveClient");
    global.ui?.setLoading(button, true, "جاري الحفظ...");

    try {
      if (state.editingId) {
        await global.api.put(`/clients/${state.editingId}`, data);
        global.ui?.toast("تم تعديل بيانات الموكل بنجاح");
      } else {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));
        const file = $("attorney_file").files[0];
        if (file) formData.append("attorney_file", file);
        await global.api.upload("/clients", formData);
        global.ui?.toast("تم إضافة الموكل بنجاح");
      }

      closeModal();
      await loadClients();
    } catch (error) {
      global.ui?.toast(message(error, "حدث خطأ أثناء حفظ بيانات الموكل"), "error");
    } finally {
      global.ui?.setLoading(button, false);
    }
  }

  async function removeClient(id, name) {
    if (!global.permissions?.isAdmin()) return;

    const confirmed = await global.ui?.confirm({
      title: "تأكيد الحذف",
      text: `سيتم حذف الموكل ${name || ""} نهائياً.`,
      confirmText: "حذف",
      cancelText: "إلغاء",
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      await global.api.delete(`/clients/${id}`);
      global.ui?.toast("تم حذف الموكل بنجاح");
      await loadClients();
    } catch (error) {
      global.ui?.toast(message(error, "حدث خطأ أثناء الحذف"), "error");
    }
  }

  function exportClients() {
    const rows = state.clients.map((client) => ({
      "الاسم": client.full_name,
      "كود الموكل": client.client_code || "",
      "الرقم القومي": client.national_id,
      "الهاتف": client.phone,
      "العنوان": client.address,
      "الملاحظات": client.notes || "",
      "تاريخ الإضافة": client.created_at || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients.xlsx");
  }

  function bindEvents() {
    $("addClientButton").addEventListener("click", () => openModal());
    $("closeModal").addEventListener("click", closeModal);
    $("cancelModal").addEventListener("click", closeModal);
    $("clientForm").addEventListener("submit", submitClient);
    $("exportClients").addEventListener("click", exportClients);

    $("dateFilter").addEventListener("change", () => {
      const custom = $("dateFilter").value === "custom";
      $("customDates").classList.toggle("hidden", !custom);
    });

    $("applyFilter").addEventListener("click", () => {
      state.filter = $("dateFilter").value;
      loadClients();
    });

    $("clearFilter").addEventListener("click", () => {
      state.filter = "all";
      state.query = "";
      $("dateFilter").value = "all";
      $("startDate").value = "";
      $("endDate").value = "";
      $("searchInput").value = "";
      $("customDates").classList.add("hidden");
      loadClients();
    });

    let timer;
    $("searchInput").addEventListener("input", () => {
      clearTimeout(timer);
      state.query = $("searchInput").value.trim();
      timer = setTimeout(loadClients, 300);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!global.auth?.requireAuth?.()) return;
    bindEvents();
    loadClients();
  });
})(window);

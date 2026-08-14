"use strict";

(function (global) {
  const clientId = new URLSearchParams(global.location.search).get("id");
  const $ = (id) => document.getElementById(id);

  function errorMessage(error, fallback) {
    return error?.body?.message || error?.message || fallback;
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString("ar-EG")} جنيه`;
  }

  function openModal() {
    $("attorneyForm").reset();
    $("attorneyModal").classList.remove("hidden");
    $("attorneyModal").classList.add("flex");
  }

  function closeModal() {
    $("attorneyModal").classList.add("hidden");
    $("attorneyModal").classList.remove("flex");
  }

  async function loadClient() {
    const client = await global.api.get(`/clients/${encodeURIComponent(clientId)}`);
    $("clientName").textContent = client.full_name || "ملف الموكل";
    $("clientCode").textContent = client.client_code ? `كود الموكل: ${client.client_code}` : "";

    const fields = [
      ["الاسم", client.full_name],
      ["كود الموكل", client.client_code || "-"],
      ["الرقم القومي", client.national_id],
      ["الهاتف", client.phone],
      ["العنوان", client.address],
      ["الملاحظات", client.notes || "-"],
    ];

    $("clientDetails").replaceChildren();
    fields.forEach(([label, value]) => {
      const box = document.createElement("div");
      box.className = "bg-gray-50 rounded-lg p-4";
      const title = document.createElement("p");
      title.className = "text-gray-500 text-sm";
      title.textContent = label;
      const content = document.createElement("p");
      content.className = "font-semibold mt-1 whitespace-pre-wrap";
      content.textContent = value ?? "-";
      box.append(title, content);
      $("clientDetails").appendChild(box);
    });
  }

  async function loadFinancials() {
    if (!global.permissions?.canViewFinancials()) return;

    const financial = await global.api.get(`/clients/${clientId}/financial-summary`);
    $("financialSection").classList.remove("hidden");
    $("totalCases").textContent = String(financial.total_cases || 0);
    $("totalServices").textContent = String(financial.total_services || 0);
    $("totalFees").textContent = money(financial.total_fees);
    $("paid").textContent = money(financial.total_paid);
    $("remaining").textContent = money(financial.remaining);
    $("expenses").textContent = money(financial.total_expenses);
    $("profit").textContent = money(financial.net_profit);
    $("collectionRate").textContent = `${financial.collection_rate || "0.0"}%`;
  }

  async function loadCases() {
    const cases = await global.api.get(`/clients/${clientId}/cases`);
    const container = $("cases");
    container.replaceChildren();

    if (!cases.length) {
      container.textContent = "لا توجد قضايا لهذا الموكل";
      return;
    }

    cases.forEach((item) => {
      const card = document.createElement("a");
      card.href = `case-profile.html?id=${encodeURIComponent(item.case_id)}`;
      card.className = "block border rounded-xl p-5 hover:shadow transition";
      const title = document.createElement("h3");
      title.className = "font-bold text-lg";
      title.textContent = item.case_title || "قضية";
      const meta = document.createElement("p");
      meta.className = "text-gray-500 mt-2";
      meta.textContent = `رقم القضية: ${item.court_case_number || "-"}`;
      const status = document.createElement("p");
      status.className = "mt-3";
      status.textContent = `الحالة: ${item.case_status || "-"}`;
      card.append(title, meta, status);
      container.appendChild(card);
    });
  }

  async function loadServices() {
    const services = await global.api.get(`/services/client/${clientId}`);
    const container = $("services");
    container.replaceChildren();

    if (!services.length) {
      container.textContent = "لا توجد خدمات لهذا الموكل";
      return;
    }

    services.forEach((item) => {
      const card = document.createElement("a");
      card.href = `service-profile.html?id=${encodeURIComponent(item.service_id)}`;
      card.className = "block border rounded-xl p-5 hover:shadow transition";
      const title = document.createElement("h3");
      title.className = "font-bold text-lg";
      title.textContent = item.service_title || "خدمة";
      const number = document.createElement("p");
      number.className = "text-gray-500 mt-2";
      number.textContent = `رقم الخدمة: ${item.service_number || "-"}`;
      const status = document.createElement("p");
      status.className = "mt-3";
      status.textContent = `الحالة: ${item.service_status || "-"}`;
      card.append(title, number, status);
      container.appendChild(card);
    });
  }

  async function loadAttorneys() {
    const attorneys = await global.api.get(`/attorneys/client/${clientId}`);
    const container = $("attorneys");
    container.replaceChildren();

    if (!attorneys.length) {
      container.textContent = "لا توجد توكيلات";
      return;
    }

    attorneys.forEach((item) => {
      const card = document.createElement("div");
      card.className = "border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3";
      const details = document.createElement("div");
      const title = document.createElement("p");
      title.className = "font-bold";
      title.textContent = `توكيل ${item.attorney_number || "-"}`;
      const meta = document.createElement("p");
      meta.className = "text-gray-500 mt-1";
      meta.textContent = `${item.attorney_type || "-"} — ${item.issuing_office || "-"}`;
      details.append(title, meta);
      card.appendChild(details);

      if (global.permissions?.canDelete() && item.id) {
        const button = document.createElement("button");
        button.className = "bg-red-600 text-white px-3 py-1 rounded-lg";
        button.textContent = "حذف";
        button.onclick = async () => {
          const confirmed = await global.ui.confirm({ title: "تأكيد الحذف", text: "سيتم حذف التوكيل نهائياً.", confirmText: "حذف", cancelText: "إلغاء" });
          if (!confirmed) return;
          try {
            await global.api.delete(`/attorneys/${item.id}`);
            global.ui.toast("تم حذف التوكيل بنجاح");
            await loadAttorneys();
          } catch (error) {
            global.ui.toast(errorMessage(error, "فشل حذف التوكيل"), "error");
          }
        };
        card.appendChild(button);
      }

      container.appendChild(card);
    });
  }

  async function loadActivity() {
    try {
      const response = await global.api.get(`/activity/client/${clientId}`);
      const items = Array.isArray(response) ? response : response?.data || [];
      const container = $("activity");
      container.replaceChildren();

      if (!items.length) {
        container.textContent = "لا يوجد نشاط مسجل";
        return;
      }

      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "border-r-4 border-primary pr-4 py-3 mb-3 bg-gray-50 rounded";
        const title = document.createElement("p");
        title.className = "font-semibold";
        title.textContent = item.description || item.action || "نشاط";
        const meta = document.createElement("p");
        meta.className = "text-gray-500 text-sm mt-1";
        meta.textContent = item.created_at || item.timestamp || "";
        row.append(title, meta);
        container.appendChild(row);
      });
    } catch (error) {
      $("activity").textContent = errorMessage(error, "فشل تحميل سجل النشاط");
    }
  }

  async function saveAttorney(event) {
    event.preventDefault();
    const button = $("saveAttorney");
    global.ui.setLoading(button, true, "جاري الحفظ...");

    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("attorney_number", $("attorney_number").value.trim());
      formData.append("attorney_type", $("attorney_type").value.trim());
      formData.append("issue_date", $("issue_date").value);
      formData.append("issuing_office", $("issuing_office").value.trim());
      formData.append("notes", $("attorney_notes").value.trim());
      const file = $("attorney_file").files[0];
      if (file) formData.append("file", file);

      await global.api.upload("/attorneys", formData);
      global.ui.toast("تم إضافة التوكيل بنجاح");
      closeModal();
      await loadAttorneys();
    } catch (error) {
      global.ui.toast(errorMessage(error, "فشل إضافة التوكيل"), "error");
    } finally {
      global.ui.setLoading(button, false);
    }
  }

  function bindEvents() {
    $("backButton").addEventListener("click", () => global.history.back());
    $("addAttorney").addEventListener("click", openModal);
    $("closeAttorney").addEventListener("click", closeModal);
    $("attorneyForm").addEventListener("submit", saveAttorney);
    $("casesTab").addEventListener("click", () => {
      $("casesSection").classList.remove("hidden");
      $("servicesSection").classList.add("hidden");
    });
    $("servicesTab").addEventListener("click", () => {
      $("servicesSection").classList.remove("hidden");
      $("casesSection").classList.add("hidden");
    });
  }

  async function init() {
    if (!global.auth?.requireAuth?.()) return;
    if (!clientId) {
      $("clientDetails").textContent = "رقم الموكل غير موجود";
      return;
    }

    bindEvents();

    try { await loadClient(); } catch (error) { $("clientDetails").textContent = errorMessage(error, "فشل تحميل بيانات الموكل"); }
    try { await loadCases(); } catch (error) { $("cases").textContent = errorMessage(error, "فشل تحميل القضايا"); }
    try { await loadServices(); } catch (error) { $("services").textContent = errorMessage(error, "فشل تحميل الخدمات"); }
    try { await loadAttorneys(); } catch (error) { $("attorneys").textContent = errorMessage(error, "فشل تحميل التوكيلات"); }
    try { await loadActivity(); } catch {}
    try { await loadFinancials(); } catch (error) {
      if (global.permissions?.canViewFinancials()) global.ui.toast(errorMessage(error, "فشل تحميل الملخص المالي"), "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);

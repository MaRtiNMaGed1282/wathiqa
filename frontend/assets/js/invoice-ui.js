"use strict";

(function (global) {
  const state = { modal: null, paymentModal: null };
  const money = (value) => `${Number(value || 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه`;
  const isFinancialUser = () => ["admin", "lawyer"].includes(String(global.auth?.getUser?.()?.role || "").toLowerCase());

  const context = () => {
    const page = (global.location.pathname.split("/").pop() || "").toLowerCase();
    const params = new URLSearchParams(global.location.search);
    const id = params.get("id") || params.get("case_id") || params.get("service_id");
    if (!id || !/^\d+$/.test(id)) return null;
    if (page === "case-profile.html") return { case_id: Number(id) };
    if (page === "service-profile.html") return { service_id: Number(id) };
    if (page === "client-profile.html") return { client_id: Number(id) };
    return null;
  };

  function toast(message, success = true) {
    if (global.Toastify) {
      global.Toastify({ text: message, duration: 3000, gravity: "top", position: "left", close: true }).showToast();
    } else if (message) {
      global.alert(message);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    }[character]));
  }

  function createModal() {
    if (state.modal) return state.modal;

    const overlay = document.createElement("div");
    overlay.id = "wathiqa-invoice-modal";
    overlay.className = "hidden fixed inset-0 bg-black/50 items-center justify-center z-[9999] p-4";
    overlay.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" dir="rtl">
      <div class="sticky top-0 bg-white border-b p-5 flex items-center justify-between z-10">
        <div><h2 class="text-2xl font-bold">نظام الفواتير</h2><p class="text-sm text-gray-500 mt-1">إنشاء وإدارة فواتير الأتعاب</p></div>
        <button type="button" data-invoice-close class="w-10 h-10 rounded-full hover:bg-gray-100 text-xl">×</button>
      </div>
      <div class="p-5">
        <div class="flex flex-wrap gap-2 mb-5">
          <button type="button" data-invoice-tab="create" class="invoice-tab bg-primary text-white px-4 py-2 rounded-lg">إنشاء فاتورة</button>
          <button type="button" data-invoice-tab="list" class="invoice-tab bg-white border px-4 py-2 rounded-lg">الفواتير</button>
        </div>
        <section data-invoice-panel="create">
          <form id="invoiceCreateForm" class="space-y-5">
            <div class="grid md:grid-cols-2 gap-4">
              <div><label class="block mb-2 font-semibold">الموكل</label><select id="invoiceClient" required class="w-full border rounded-lg p-3"><option value="">جاري التحميل...</option></select></div>
              <div><label class="block mb-2 font-semibold">تاريخ الاستحقاق</label><input id="invoiceDueDate" type="date" class="w-full border rounded-lg p-3" /></div>
            </div>
            <div class="grid md:grid-cols-2 gap-4">
              <div><label class="block mb-2 font-semibold">تاريخ الإصدار</label><input id="invoiceIssueDate" type="date" required class="w-full border rounded-lg p-3" /></div>
              <div><label class="block mb-2 font-semibold">الخصم</label><input id="invoiceDiscount" type="number" min="0" step="0.01" value="0" class="w-full border rounded-lg p-3" /></div>
            </div>
            <div class="border rounded-xl overflow-hidden">
              <div class="bg-gray-50 p-3 flex justify-between items-center"><h3 class="font-bold">بنود الفاتورة</h3><button type="button" data-invoice-add-item class="bg-accent text-white px-3 py-2 rounded-lg">+ إضافة بند</button></div>
              <div id="invoiceItems" class="p-3 space-y-3"></div>
            </div>
            <div class="grid md:grid-cols-3 gap-4">
              <div class="bg-gray-50 rounded-xl p-4"><span class="text-sm text-gray-500">الإجمالي الفرعي</span><strong id="invoiceSubtotal" class="block text-xl mt-1">0 جنيه</strong></div>
              <div class="bg-gray-50 rounded-xl p-4"><span class="text-sm text-gray-500">الخصم</span><strong id="invoiceDiscountTotal" class="block text-xl mt-1">0 جنيه</strong></div>
              <div class="bg-primary text-white rounded-xl p-4"><span class="text-sm opacity-80">الإجمالي</span><strong id="invoiceTotal" class="block text-xl mt-1">0 جنيه</strong></div>
            </div>
            <div><label class="block mb-2 font-semibold">ملاحظات</label><textarea id="invoiceNotes" rows="3" class="w-full border rounded-lg p-3"></textarea></div>
            <div class="flex justify-end"><button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg">إنشاء الفاتورة</button></div>
          </form>
        </section>
        <section data-invoice-panel="list" class="hidden">
          <div class="flex flex-wrap gap-3 mb-4 items-stretch">
            <input id="invoiceSearch" placeholder="بحث برقم الفاتورة أو اسم الموكل" class="flex-1 min-w-[320px] border rounded-lg p-3" />
            <select id="invoiceStatus" class="w-56 shrink-0 border rounded-lg p-3"><option value="">كل الحالات</option><option value="issued">صادرة</option><option value="partial">جزئية</option><option value="paid">مدفوعة</option><option value="cancelled">ملغاة</option></select>
            <button type="button" data-invoice-refresh class="shrink-0 min-w-[96px] bg-gray-100 px-4 rounded-lg">تحديث</button>
          </div>
          <div id="invoiceList" class="space-y-3"></div>
        </section>
      </div>
    </div>`;

    document.body.appendChild(overlay);
    state.modal = overlay;

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-invoice-close]")) return close();
      if (event.target.closest("[data-invoice-add-item]")) addItem();
      const tab = event.target.closest("[data-invoice-tab]");
      if (tab) switchTab(tab.dataset.invoiceTab);
      const print = event.target.closest("[data-invoice-print]");
      if (print) printInvoice(print.dataset.invoicePrint);
      const pay = event.target.closest("[data-invoice-pay]");
      if (pay) recordPayment(pay.dataset.invoicePay);
      const cancel = event.target.closest("[data-invoice-cancel]");
      if (cancel) cancelInvoice(cancel.dataset.invoiceCancel);
    });

    overlay.querySelector("#invoiceCreateForm").addEventListener("submit", submitInvoice);
    overlay.querySelector("#invoiceSearch").addEventListener("input", loadList);
    overlay.querySelector("#invoiceStatus").addEventListener("change", loadList);
    overlay.querySelector("[data-invoice-refresh]").addEventListener("click", loadList);
    return overlay;
  }

  function addItem(item = {}) {
    const row = document.createElement("div");
    row.className = "invoice-item grid md:grid-cols-[1fr_130px_150px_40px] gap-2 items-center";
    row.innerHTML = `<input data-field="description" required placeholder="وصف البند" value="${escapeHtml(item.description || "")}" class="border rounded-lg p-3"/><input data-field="quantity" type="number" min="1" step="1" value="${item.quantity || 1}" class="border rounded-lg p-3"/><input data-field="unit_price" type="number" min="0" step="0.01" value="${item.unit_price ?? ""}" placeholder="سعر الوحدة" class="border rounded-lg p-3"/><button type="button" class="text-red-600 text-xl" data-remove-item>×</button>`;
    row.querySelectorAll("input").forEach((input) => input.addEventListener("input", calculate));
    row.querySelector("[data-remove-item]").addEventListener("click", () => { row.remove(); calculate(); });
    state.modal.querySelector("#invoiceItems").appendChild(row);
    calculate();
  }

  function calculate() {
    let subtotal = 0;
    state.modal.querySelectorAll(".invoice-item").forEach((row) => {
      subtotal += Number(row.querySelector('[data-field="quantity"]').value || 0) * Number(row.querySelector('[data-field="unit_price"]').value || 0);
    });
    const discount = Math.min(Math.max(0, Number(state.modal.querySelector("#invoiceDiscount").value || 0)), subtotal);
    const total = subtotal - discount;
    state.modal.querySelector("#invoiceSubtotal").textContent = money(subtotal);
    state.modal.querySelector("#invoiceDiscountTotal").textContent = money(discount);
    state.modal.querySelector("#invoiceTotal").textContent = money(total);
  }

  async function loadClients(selected) {
    const select = state.modal.querySelector("#invoiceClient");
    try {
      if (selected) {
        const client = await global.api.get(`/clients/${selected}`);
        select.innerHTML = `<option value="${client.id}">${escapeHtml(client.full_name)}</option>`;
        select.value = String(selected);
        return;
      }
      const rows = await global.api.get("/clients");
      select.innerHTML = '<option value="">اختر الموكل</option>';
      (Array.isArray(rows) ? rows : []).forEach((client) => {
        const option = document.createElement("option");
        option.value = client.id;
        option.textContent = client.full_name;
        select.appendChild(option);
      });
    } catch (error) {
      select.innerHTML = '<option value="">تعذر تحميل الموكلين</option>';
      toast(error?.message || "فشل تحميل الموكلين", false);
    }
  }

  async function submitInvoice(event) {
    event.preventDefault();
    const rows = [...state.modal.querySelectorAll(".invoice-item")];
    const ctx = context();
    const payload = {
      client_id: Number(state.modal.querySelector("#invoiceClient").value),
      case_id: ctx?.case_id || undefined,
      service_id: ctx?.service_id || undefined,
      issue_date: state.modal.querySelector("#invoiceIssueDate").value,
      due_date: state.modal.querySelector("#invoiceDueDate").value || null,
      discount: Number(state.modal.querySelector("#invoiceDiscount").value || 0),
      notes: state.modal.querySelector("#invoiceNotes").value.trim() || null,
      items: rows.map((row) => ({
        description: row.querySelector('[data-field="description"]').value.trim(),
        quantity: Number(row.querySelector('[data-field="quantity"]').value),
        unit_price: Number(row.querySelector('[data-field="unit_price"]').value),
      })),
    };

    if (!payload.client_id || !payload.items.length) return toast("اختر الموكل وأضف بنداً واحداً على الأقل", false);
    try {
      const result = await global.api.post("/invoices", payload);
      toast(`${result.message} — ${result.invoice_number}`, true);
      await loadList();
      switchTab("list");
    } catch (error) {
      toast(error?.message || "فشل إنشاء الفاتورة", false);
    }
  }

  async function loadList() {
    const box = state.modal?.querySelector("#invoiceList");
    if (!box) return;
    box.innerHTML = '<div class="text-center py-8 text-gray-500">جاري التحميل...</div>';
    try {
      const search = state.modal.querySelector("#invoiceSearch").value.trim();
      const status = state.modal.querySelector("#invoiceStatus").value;
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const rows = await global.api.get(`/invoices?${params.toString()}`);
      if (!rows.length) {
        box.innerHTML = '<div class="text-center py-8 text-gray-500">لا توجد فواتير</div>';
        return;
      }

      box.innerHTML = rows.map((row) => {
        const remaining = Number(row.remaining || 0);
        const cancelled = String(row.status || "").toLowerCase() === "cancelled";
        const paymentButton = !cancelled && remaining > 0
          ? `<button type="button" data-invoice-pay="${row.invoice_id}" style="display:inline-flex!important;align-items:center;justify-content:center;min-width:78px;min-height:42px;cursor:pointer;pointer-events:auto;background:#15803d;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-family:inherit;font-weight:600;position:relative;z-index:5;">دفعة</button>`
          : "";
        const cancelButton = !cancelled && Number(row.paid || 0) === 0
          ? `<button type="button" data-invoice-cancel="${row.invoice_id}" style="display:inline-flex!important;align-items:center;justify-content:center;min-width:78px;min-height:42px;cursor:pointer;pointer-events:auto;background:#dc2626;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-family:inherit;font-weight:600;position:relative;z-index:5;">إلغاء</button>`
          : "";
        return `<article class="border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
          <div><div class="font-bold">${escapeHtml(row.invoice_number)}</div><div class="text-sm text-gray-500">${escapeHtml(row.client_name || "—")}${row.case_number ? ` • ${escapeHtml(row.case_number)}` : row.service_name ? ` • ${escapeHtml(row.service_name)}` : ""}</div></div>
          <div class="text-sm">الإجمالي: <b>${money(row.total)}</b><br/>المتبقي: <b>${money(remaining)}</b></div>
          <div class="flex flex-wrap gap-2 items-center">
            <button type="button" data-invoice-print="${row.invoice_id}" style="display:inline-flex!important;align-items:center;justify-content:center;min-width:78px;min-height:42px;cursor:pointer;pointer-events:auto;background:#273247;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-family:inherit;font-weight:600;position:relative;z-index:5;">طباعة</button>
            ${paymentButton}
            ${cancelButton}
          </div>
        </article>`;
      }).join("");
    } catch (error) {
      box.innerHTML = `<div class="text-center py-8 text-red-600">${escapeHtml(error?.message || "فشل تحميل الفواتير")}</div>`;
    }
  }

  function closePaymentModal() {
    if (!state.paymentModal) return;
    state.paymentModal.remove();
    state.paymentModal = null;
  }

  function createPaymentModal(invoice) {
    closePaymentModal();
    const overlay = document.createElement("div");
    overlay.id = "wathiqa-payment-modal";
    overlay.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4";
    overlay.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" dir="rtl">
      <div class="flex items-center justify-between mb-5"><h3 class="text-xl font-bold">تسجيل دفعة</h3><button type="button" data-payment-close class="text-xl">×</button></div>
      <div class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-3">الفاتورة: <b>${escapeHtml(invoice.invoice_number)}</b><br/>المتبقي: <b>${money(invoice.remaining)}</b></div>
        <label class="block">المبلغ<input id="paymentAmount" type="number" min="0.01" max="${Number(invoice.remaining || 0)}" step="0.01" class="w-full border rounded-lg p-3 mt-1" /></label>
        <label class="block">طريقة الدفع<select id="paymentMethod" class="w-full border rounded-lg p-3 mt-1"><option value="cash">نقدي</option><option value="bank">تحويل بنكي</option><option value="card">بطاقة</option></select></label>
        <label class="block">ملاحظات<textarea id="paymentNotes" rows="3" class="w-full border rounded-lg p-3 mt-1"></textarea></label>
        <div class="flex justify-end gap-2"><button type="button" data-payment-close class="px-4 py-2 border rounded-lg">إلغاء</button><button type="button" data-payment-submit class="bg-primary text-white px-4 py-2 rounded-lg">تسجيل الدفعة</button></div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    state.paymentModal = overlay;
    overlay.addEventListener("click", async (event) => {
      if (event.target === overlay || event.target.closest("[data-payment-close]")) return closePaymentModal();
      if (!event.target.closest("[data-payment-submit]")) return;
      const amount = Number(overlay.querySelector("#paymentAmount").value || 0);
      if (amount <= 0 || amount > Number(invoice.remaining || 0)) return toast("أدخل مبلغاً صحيحاً", false);
      try {
        const result = await global.api.post(`/invoices/${invoice.invoice_id}/payments`, { amount, payment_method: overlay.querySelector("#paymentMethod").value, notes: overlay.querySelector("#paymentNotes").value.trim() || null });
        closePaymentModal();
        toast(result.message || "تم تسجيل الدفعة بنجاح", true);
        await loadList();
      } catch (error) { toast(error?.message || "فشل تسجيل الدفعة", false); }
    });
  }

  async function recordPayment(id) {
    try { createPaymentModal(await global.api.get(`/invoices/${id}`)); }
    catch (error) { toast(error?.message || "تعذر تحميل الفاتورة", false); }
  }

  async function cancelInvoice(id) {
    if (!global.Swal) return;
    const confirmation = await global.Swal.fire({ title: "إلغاء الفاتورة", text: "هل تريد إلغاء هذه الفاتورة؟", icon: "warning", showCancelButton: true, confirmButtonText: "إلغاء الفاتورة", cancelButtonText: "تراجع", reverseButtons: true, confirmButtonColor: "#dc2626" });
    if (!confirmation.isConfirmed) return;
    try { const result = await global.api.put(`/invoices/${id}/cancel`, {}); toast(result.message || "تم إلغاء الفاتورة", true); await loadList(); }
    catch (error) { toast(error?.message || "فشل إلغاء الفاتورة", false); }
  }

  async function printInvoice(id) {
    try {
      const invoice = await global.api.get(`/invoices/${id}`);
      const printWindow = global.open("", "_blank");
      if (!printWindow) return toast("تعذر فتح نافذة الطباعة", false);
      const items = (invoice.items || []).map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${money(item.unit_price)}</td><td>${money(item.total)}</td></tr>`).join("");
      printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoice_number)}</title><style>body{font-family:Cairo,Arial,sans-serif;padding:32px;color:#273247}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:10px;text-align:right}th{background:#273247;color:#fff}.total{font-size:22px;font-weight:bold;margin-top:20px}</style></head><body><h1>فاتورة ${escapeHtml(invoice.invoice_number)}</h1><p>الموكل: ${escapeHtml(invoice.client_name || "—")}</p><table><thead><tr><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${items}</tbody></table><div class="total">الإجمالي: ${money(invoice.total)}</div></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) { toast(error?.message || "تعذر تجهيز الفاتورة للطباعة", false); }
  }

  function switchTab(tab) {
    state.modal.querySelectorAll("[data-invoice-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.invoicePanel !== tab));
    state.modal.querySelectorAll("[data-invoice-tab]").forEach((button) => button.classList.toggle("bg-primary", button.dataset.invoiceTab === tab));
    if (tab === "create") {
      loadClients(context()?.client_id);
      if (!state.modal.querySelector("#invoiceItems .invoice-item")) addItem();
      state.modal.querySelector("#invoiceIssueDate").value ||= new Date().toISOString().slice(0, 10);
      calculate();
    } else loadList();
  }

  function open(options = {}) {
    const modal = createModal();
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    switchTab(options.tab || "create");
    if (options.clientId) loadClients(options.clientId);
  }

  function close() {
    if (!state.modal) return;
    state.modal.classList.add("hidden");
    state.modal.classList.remove("flex");
    closePaymentModal();
  }

  function injectStyles() {
    if (document.getElementById("wathiqa-invoice-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "wathiqa-invoice-ui-styles";
    style.textContent = `
      #wathiqa-invoice-modal #invoiceSearch {
        flex: 1 1 0%;
        min-width: 320px;
      }
      #wathiqa-invoice-modal #invoiceStatus {
        width: 14rem;
        min-width: 14rem;
        flex: 0 0 14rem;
      }
      #wathiqa-invoice-modal [data-invoice-refresh] {
        min-width: 96px;
        flex: 0 0 auto;
      }
      @media (max-width: 720px) {
        #wathiqa-invoice-modal #invoiceSearch,
        #wathiqa-invoice-modal #invoiceStatus,
        #wathiqa-invoice-modal [data-invoice-refresh] {
          width: 100%;
          min-width: 0;
          flex: 1 1 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  global.WathiqaInvoice = Object.freeze({ open, close });
  injectStyles();
})(window);

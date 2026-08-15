"use strict";

(function (global) {
  const state = { modal: null, printWindow: null };
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
    if (global.Toastify) global.Toastify({ text: message, duration: 3000, gravity: "top", position: "left", close: true, style: { background: success ? "#15803d" : "#b42318" } }).showToast();
    else global.alert(message);
  }

  function createModal() {
    if (state.modal) return state.modal;
    const overlay = document.createElement("div");
    overlay.id = "wathiqa-invoice-modal";
    overlay.className = "hidden fixed inset-0 bg-black/50 items-center justify-center z-[9999] p-4";
    overlay.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" dir="rtl">
      <div class="sticky top-0 bg-white border-b p-5 flex items-center justify-between z-10"><div><h2 class="text-2xl font-bold">نظام الفواتير</h2><p class="text-sm text-gray-500 mt-1">إنشاء وإدارة فواتير الأتعاب</p></div><button type="button" data-invoice-close class="w-10 h-10 rounded-full hover:bg-gray-100 text-xl">×</button></div>
      <div class="p-5"><div class="flex flex-wrap gap-2 mb-5"><button data-invoice-tab="create" class="invoice-tab bg-primary text-white px-4 py-2 rounded-lg">إنشاء فاتورة</button><button data-invoice-tab="list" class="invoice-tab bg-white border px-4 py-2 rounded-lg">الفواتير</button></div>
      <section data-invoice-panel="create"><form id="invoiceCreateForm" class="space-y-5"><div class="grid md:grid-cols-2 gap-4"><div><label class="block mb-2 font-semibold">الموكل</label><select id="invoiceClient" required class="w-full border rounded-lg p-3"><option value="">جاري التحميل...</option></select></div><div><label class="block mb-2 font-semibold">تاريخ الاستحقاق</label><input id="invoiceDueDate" type="date" class="w-full border rounded-lg p-3" /></div></div><div class="grid md:grid-cols-2 gap-4"><div><label class="block mb-2 font-semibold">تاريخ الإصدار</label><input id="invoiceIssueDate" type="date" required class="w-full border rounded-lg p-3" /></div><div><label class="block mb-2 font-semibold">الخصم</label><input id="invoiceDiscount" type="number" min="0" step="0.01" value="0" class="w-full border rounded-lg p-3" /></div></div><div class="border rounded-xl overflow-hidden"><div class="bg-gray-50 p-3 flex justify-between items-center"><h3 class="font-bold">بنود الفاتورة</h3><button type="button" data-invoice-add-item class="bg-accent text-white px-3 py-2 rounded-lg">+ إضافة بند</button></div><div id="invoiceItems" class="p-3 space-y-3"></div></div><div class="grid md:grid-cols-3 gap-4"><div class="bg-gray-50 rounded-xl p-4"><span class="text-sm text-gray-500">الإجمالي الفرعي</span><strong id="invoiceSubtotal" class="block text-xl mt-1">0 جنيه</strong></div><div class="bg-gray-50 rounded-xl p-4"><span class="text-sm text-gray-500">الخصم</span><strong id="invoiceDiscountTotal" class="block text-xl mt-1">0 جنيه</strong></div><div class="bg-primary text-white rounded-xl p-4"><span class="text-sm opacity-80">الإجمالي</span><strong id="invoiceTotal" class="block text-xl mt-1">0 جنيه</strong></div></div><div><label class="block mb-2 font-semibold">ملاحظات</label><textarea id="invoiceNotes" rows="3" class="w-full border rounded-lg p-3"></textarea></div><div class="flex justify-end"><button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg">إنشاء الفاتورة</button></div></form></section>
      <section data-invoice-panel="list" class="hidden"><div class="flex gap-3 mb-4"><input id="invoiceSearch" placeholder="بحث برقم الفاتورة أو اسم الموكل" class="flex-1 border rounded-lg p-3"/><select id="invoiceStatus" class="border rounded-lg p-3"><option value="">كل الحالات</option><option value="issued">صادرة</option><option value="partial">جزئية</option><option value="paid">مدفوعة</option><option value="cancelled">ملغاة</option></select><button type="button" data-invoice-refresh class="bg-gray-100 px-4 rounded-lg">تحديث</button></div><div id="invoiceList" class="space-y-3"></div></section></div></div>`;
    document.body.appendChild(overlay);
    state.modal = overlay;
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-invoice-close]")) return close();
      if (event.target.closest("[data-invoice-add-item]")) addItem();
      const tab = event.target.closest("[data-invoice-tab]"); if (tab) switchTab(tab.dataset.invoiceTab);
      const print = event.target.closest("[data-invoice-print]"); if (print) printInvoice(print.dataset.invoicePrint);
      const pay = event.target.closest("[data-invoice-pay]"); if (pay) recordPayment(pay.dataset.invoicePay);
      const cancel = event.target.closest("[data-invoice-cancel]"); if (cancel) cancelInvoice(cancel.dataset.invoiceCancel);
    });
    overlay.querySelector("#invoiceCreateForm").addEventListener("submit", submitInvoice);
    overlay.querySelector("#invoiceSearch").addEventListener("input", loadList);
    overlay.querySelector("#invoiceStatus").addEventListener("change", loadList);
    overlay.querySelector("[data-invoice-refresh]").addEventListener("click", loadList);
    return overlay;
  }

  function addItem(item = {}) {
    const row = document.createElement("div"); row.className = "invoice-item grid md:grid-cols-[1fr_130px_150px_40px] gap-2 items-center";
    row.innerHTML = `<input data-field="description" required placeholder="وصف البند" value="${String(item.description || "").replaceAll('"', '&quot;')}" class="border rounded-lg p-3"/><input data-field="quantity" type="number" min="0.01" step="0.01" value="${item.quantity || 1}" class="border rounded-lg p-3"/><input data-field="unit_price" type="number" min="0" step="0.01" value="${item.unit_price || ""}" placeholder="سعر الوحدة" class="border rounded-lg p-3"/><button type="button" class="text-red-600 text-xl" data-remove-item>×</button>`;
    row.querySelectorAll("input").forEach((input) => input.addEventListener("input", calculate)); row.querySelector("[data-remove-item]").addEventListener("click", () => { row.remove(); calculate(); });
    state.modal.querySelector("#invoiceItems").appendChild(row); calculate();
  }

  function calculate() {
    let subtotal = 0; state.modal.querySelectorAll(".invoice-item").forEach((row) => { subtotal += Number(row.querySelector('[data-field="quantity"]').value || 0) * Number(row.querySelector('[data-field="unit_price"]').value || 0); });
    const discount = Math.min(Math.max(0, Number(state.modal.querySelector("#invoiceDiscount").value || 0)), subtotal); const total = subtotal - discount;
    state.modal.querySelector("#invoiceSubtotal").textContent = money(subtotal); state.modal.querySelector("#invoiceDiscountTotal").textContent = money(discount); state.modal.querySelector("#invoiceTotal").textContent = money(total);
  }

  async function loadClients(selected) {
    const select = state.modal.querySelector("#invoiceClient");
    if (selected) { const client = await global.api.get(`/clients/${selected}`); select.innerHTML = `<option value="${client.id}">${client.full_name}</option>`; select.value = String(selected); return; }
    const rows = await global.api.get("/clients"); select.innerHTML = '<option value="">اختر الموكل</option>'; (Array.isArray(rows) ? rows : []).forEach((client) => { const option = document.createElement("option"); option.value = client.id; option.textContent = client.full_name; select.appendChild(option); });
  }

  async function submitInvoice(event) {
    event.preventDefault(); const rows = [...state.modal.querySelectorAll(".invoice-item")]; const ctx = context(); const payload = { client_id: Number(state.modal.querySelector("#invoiceClient").value), case_id: ctx?.case_id || undefined, service_id: ctx?.service_id || undefined, issue_date: state.modal.querySelector("#invoiceIssueDate").value, due_date: state.modal.querySelector("#invoiceDueDate").value || null, discount: Number(state.modal.querySelector("#invoiceDiscount").value || 0), notes: state.modal.querySelector("#invoiceNotes").value.trim() || null, items: rows.map((row) => ({ description: row.querySelector('[data-field="description"]').value.trim(), quantity: Number(row.querySelector('[data-field="quantity"]').value), unit_price: Number(row.querySelector('[data-field="unit_price"]').value) })) };
    if (!payload.client_id || !payload.items.length) return toast("اختر الموكل وأضف بنداً واحداً على الأقل", false);
    try { const result = await global.api.post("/invoices", payload); toast(`${result.message} — ${result.invoice_number}`, true); await loadList(); switchTab("list"); } catch (error) { toast(error.message || "فشل إنشاء الفاتورة", false); }
  }

  async function loadList() {
    const box = state.modal?.querySelector("#invoiceList"); if (!box) return; box.innerHTML = '<div class="text-center py-8 text-gray-500">جاري التحميل...</div>';
    try { const search = state.modal.querySelector("#invoiceSearch").value.trim(); const status = state.modal.querySelector("#invoiceStatus").value; const params = new URLSearchParams(); if (search) params.set("search", search); if (status) params.set("status", status); const rows = await global.api.get(`/invoices?${params}`); if (!rows.length) { box.innerHTML = '<div class="text-center py-8 text-gray-500">لا توجد فواتير</div>'; return; } box.innerHTML = rows.map((row) => `<article class="border rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between"><div><div class="font-bold">${row.invoice_number}</div><div class="text-sm text-gray-500">${row.client_name || "—"}${row.case_number ? ` • ${row.case_number}` : row.service_name ? ` • ${row.service_name}` : ""}</div></div><div class="text-sm">الإجمالي: <b>${money(row.total)}</b><br/>المتبقي: <b>${money(row.remaining)}</b></div><div class="flex gap-2"><button data-invoice-print="${row.invoice_id}" class="bg-primary text-white px-3 py-2 rounded-lg">طباعة</button>${row.remaining > 0 && row.status !== "cancelled" ? `<button data-invoice-pay="${row.invoice_id}" class="bg-green-600 text-white px-3 py-2 rounded-lg">دفعة</button>` : ""}${row.status !== "cancelled" && Number(row.paid || 0) === 0 ? `<button data-invoice-cancel="${row.invoice_id}" class="bg-red-600 text-white px-3 py-2 rounded-lg">إلغاء</button>` : ""}</div></article>`).join(""); }
    catch (error) { box.innerHTML = `<div class="text-center py-8 text-red-600">${error.message || "فشل تحميل الفواتير"}</div>`; }
  }

  async function recordPayment(id) {
    const amount = global.prompt("قيمة الدفعة:"); if (amount === null) return; const method = global.prompt("طريقة الدفع:", "نقدي"); if (method === null) return;
    try { const result = await global.api.post(`/invoices/${id}/payments`, { amount: Number(amount), payment_date: new Date().toISOString().slice(0, 10), payment_method: method }); toast(result.message || "تم تسجيل الدفعة", true); await loadList(); } catch (error) { toast(error.message || "فشل تسجيل الدفعة", false); }
  }

  async function cancelInvoice(id) { if (!global.confirm("هل تريد إلغاء الفاتورة؟")) return; try { const result = await global.api.patch(`/invoices/${id}/cancel`, {}); toast(result.message || "تم إلغاء الفاتورة", true); await loadList(); } catch (error) { toast(error.message || "فشل إلغاء الفاتورة", false); } }

  async function printInvoice(id) {
    try { const invoice = await global.api.get(`/invoices/${id}`); const items = invoice.items.map((item) => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${money(item.unit_price)}</td><td>${money(item.line_total)}</td></tr>`).join(""); const win = global.open("", "_blank", "width=900,height=800"); if (!win) return toast("تعذر فتح نافذة الطباعة", false); win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${invoice.invoice_number}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#1f2937}h1{margin-bottom:4px}.meta{color:#6b7280;margin-bottom:30px}.box{border:1px solid #ddd;border-radius:12px;padding:20px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:right}th{background:#f5f5f5}.total{font-size:20px;font-weight:700;text-align:left;margin-top:20px}@media print{button{display:none}}</style></head><body><h1>فاتورة ${invoice.invoice_number}</h1><div class="meta">تاريخ الإصدار: ${invoice.issue_date || "—"} ${invoice.due_date ? ` | الاستحقاق: ${invoice.due_date}` : ""}</div><div class="box"><b>الموكل:</b> ${invoice.client_name || "—"}<br><b>الهاتف:</b> ${invoice.client_phone || "—"}<br><b>العنوان:</b> ${invoice.client_address || "—"}${invoice.case_number ? `<br><b>القضية:</b> ${invoice.case_number}` : ""}${invoice.service_name ? `<br><b>الخدمة:</b> ${invoice.service_name}` : ""}</div><table><thead><tr><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${items}</tbody></table><div class="total">الإجمالي الفرعي: ${money(invoice.subtotal)}<br>الخصم: ${money(invoice.discount)}<br>الإجمالي: ${money(invoice.total)}<br>المحصل: ${money(invoice.paid)}<br>المتبقي: ${money(invoice.remaining)}</div>${invoice.notes ? `<div class="box"><b>ملاحظات:</b><br>${invoice.notes}</div>` : ""}<script>window.onload=()=>window.print()<\/script></body></html>`); win.document.close(); }
    catch (error) { toast(error.message || "فشل تجهيز الفاتورة", false); }
  }

  function switchTab(tab) { state.modal.querySelectorAll("[data-invoice-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.invoicePanel !== tab)); state.modal.querySelectorAll("[data-invoice-tab]").forEach((button) => { const active = button.dataset.invoiceTab === tab; button.className = active ? "invoice-tab bg-primary text-white px-4 py-2 rounded-lg" : "invoice-tab bg-white border px-4 py-2 rounded-lg"; }); if (tab === "list") loadList(); }
  function open(mode = "create") { if (!isFinancialUser()) return toast("ليس لديك صلاحية للوصول إلى الفواتير", false); const modal = createModal(); modal.classList.remove("hidden"); modal.classList.add("flex"); const ctx = context(); state.modal.querySelector("#invoiceIssueDate").value = new Date().toISOString().slice(0,10); state.modal.querySelector("#invoiceItems").replaceChildren(); addItem(); loadClients(ctx?.client_id); switchTab(mode); }
  function close() { if (!state.modal) return; state.modal.classList.add("hidden"); state.modal.classList.remove("flex"); }

  function addButtons() {
    if (!isFinancialUser()) return;
    const page = (global.location.pathname.split("/").pop() || "").toLowerCase();
    if (["case-profile.html", "service-profile.html", "client-profile.html"].includes(page) && !document.getElementById("create-invoice-button")) { const button = document.createElement("button"); button.id = "create-invoice-button"; button.type = "button"; button.className = "bg-primary text-white px-4 py-2 rounded-lg"; button.textContent = "إنشاء فاتورة"; button.addEventListener("click", () => open("create")); const heading = document.querySelector("h1"); const header = heading?.parentElement; if (header?.classList.contains("flex")) header.appendChild(button); }
    if (page === "revenues.html" && !document.getElementById("invoice-system-button")) { const button = document.createElement("button"); button.id = "invoice-system-button"; button.type = "button"; button.className = "bg-primary text-white px-4 py-2 rounded-lg"; button.textContent = "الفواتير"; button.addEventListener("click", () => open("list")); const headings = document.querySelectorAll("h1"); const heading = [...headings].find((h) => h.textContent.trim() === "الإيرادات"); const header = heading?.parentElement; if (header) header.appendChild(button); }
  }

  function init() { addButtons(); const observer = new MutationObserver(addButtons); observer.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
  global.WathiqaInvoiceUI = Object.freeze({ open, close, printInvoice });
})(window);

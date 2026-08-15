"use strict";

(function (global) {
  const ENTITY_LABELS = Object.freeze({ client: "الموكل", case: "القضية", service: "الخدمة" });
  const LIST_ROUTES = Object.freeze({ client: "clients.html", case: "cases.html", service: "services.html" });
  const state = { modal: null, activeType: "" };

  function getPageContext() {
    const page = (global.location.pathname.split("/").pop() || "").toLowerCase();
    const params = new URLSearchParams(global.location.search);
    const id = params.get("id") || params.get("record_id") || params.get("case_id") || params.get("service_id");
    if (!id || !/^\d+$/.test(id)) return null;
    if (page === "client-profile.html") return { type: "client", id: Number(id) };
    if (page === "case-profile.html") return { type: "case", id: Number(id) };
    if (page === "service-profile.html") return { type: "service", id: Number(id) };
    return null;
  }

  function isAdmin() { try { return String(global.auth?.getUser?.()?.role || "").toLowerCase() === "admin"; } catch (_) { return false; } }
  function toast(message, success = true) { if (typeof global.Toastify === "function") global.Toastify({ text: message, duration: 3000, gravity: "top", position: "left", close: true, stopOnFocus: true, style: { background: success ? "#16a34a" : "#dc2626" } }).showToast(); else global.alert(message); }

  async function confirmArchive(label) {
    const text = `سيتم نقل ${label} إلى الأرشيف ولن يظهر ضمن السجلات النشطة.`;
    if (global.Swal?.fire) { const result = await global.Swal.fire({ title: "تأكيد الأرشفة", text, input: "textarea", inputLabel: "سبب الأرشفة (اختياري)", inputPlaceholder: "اكتب سبب الأرشفة...", showCancelButton: true, confirmButtonText: "أرشفة", cancelButtonText: "إلغاء", confirmButtonColor: "#b45309", reverseButtons: true }); return result.isConfirmed ? String(result.value || "").trim() : null; }
    return global.confirm(text) ? "" : null;
  }

  async function archiveRecord(type, id, label) {
    const reason = await confirmArchive(label); if (reason === null) return;
    try { const result = await global.api.post("/archive", { entityType: type, recordId: id, reason: reason || null }); toast(result?.message || "تمت الأرشفة بنجاح", true); setTimeout(() => { global.location.href = LIST_ROUTES[type]; }, 450); }
    catch (error) { console.error("Archive failed:", error); toast(error?.message || "فشل تنفيذ الأرشفة", false); }
  }

  function addProfileArchiveButton() {
    if (!isAdmin()) return; const context = getPageContext(); if (!context || document.getElementById("archive-record-button")) return;
    const button = document.createElement("button"); button.id = "archive-record-button"; button.type = "button"; button.className = "bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition"; button.textContent = `أرشفة ${ENTITY_LABELS[context.type]}`;
    button.addEventListener("click", () => archiveRecord(context.type, context.id, ENTITY_LABELS[context.type]));
    const heading = document.querySelector("h1"); const header = heading?.parentElement;
    if (header && header.classList.contains("flex")) header.appendChild(button); else { button.style.position = "fixed"; button.style.top = "18px"; button.style.left = "18px"; button.style.zIndex = "9999"; document.body.appendChild(button); }
  }

  function createArchiveModal() {
    if (state.modal) return state.modal;
    const overlay = document.createElement("div"); overlay.id = "wathiqa-archive-modal"; overlay.className = "hidden fixed inset-0 bg-black/50 items-center justify-center z-[9999] p-4";
    overlay.innerHTML = `<div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden" dir="rtl"><div class="flex items-center justify-between p-5 border-b"><div><h2 class="text-2xl font-bold">الأرشيف</h2><p class="text-sm text-gray-500 mt-1">السجلات المؤرشفة غير المستعادة</p></div><button type="button" data-archive-close class="w-10 h-10 rounded-full hover:bg-gray-100 text-xl">×</button></div><div class="p-4 border-b flex flex-wrap gap-2"><button data-archive-filter="" class="archive-filter bg-primary text-white px-4 py-2 rounded-lg">الكل</button><button data-archive-filter="client" class="archive-filter bg-white border border-primary text-primary px-4 py-2 rounded-lg">الموكلون</button><button data-archive-filter="case" class="archive-filter bg-white border border-primary text-primary px-4 py-2 rounded-lg">القضايا</button><button data-archive-filter="service" class="archive-filter bg-white border border-primary text-primary px-4 py-2 rounded-lg">الخدمات</button><button data-archive-refresh type="button" class="mr-auto bg-gray-100 px-4 py-2 rounded-lg">تحديث</button></div><div data-archive-body class="overflow-auto max-h-[65vh] p-4"></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => { if (event.target === overlay || event.target.closest("[data-archive-close]")) return closeArchiveModal(); const filter = event.target.closest("[data-archive-filter]"); if (filter) { state.activeType = filter.dataset.archiveFilter || ""; updateArchiveFilterStyles(); loadArchiveRecords(); return; } const restore = event.target.closest("[data-archive-restore]"); if (restore) { restoreRecord(restore.dataset.archiveRestore); return; } if (event.target.closest("[data-archive-refresh]")) loadArchiveRecords(); });
    state.modal = overlay; return overlay;
  }

  function updateArchiveFilterStyles() { state.modal?.querySelectorAll("[data-archive-filter]").forEach((button) => { const active = button.dataset.archiveFilter === state.activeType; button.className = active ? "archive-filter bg-primary text-white px-4 py-2 rounded-lg" : "archive-filter bg-white border border-primary text-primary px-4 py-2 rounded-lg"; }); }

  async function loadArchiveRecords() {
    const body = state.modal?.querySelector("[data-archive-body]"); if (!body) return; body.innerHTML = '<div class="py-12 text-center text-gray-500">جاري تحميل الأرشيف...</div>';
    try { const url = state.activeType ? `/archive?type=${encodeURIComponent(state.activeType)}` : "/archive"; const rows = await global.api.get(url); if (!rows?.length) { body.innerHTML = '<div class="py-12 text-center text-gray-500">لا توجد سجلات مؤرشفة</div>'; return; } body.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-right"><thead class="bg-gray-50"><tr><th class="p-3">النوع</th><th class="p-3">رقم السجل</th><th class="p-3">السبب</th><th class="p-3">بواسطة</th><th class="p-3">التاريخ</th><th class="p-3">الإجراء</th></tr></thead><tbody>${rows.map((row) => `<tr class="border-b"><td class="p-3">${ENTITY_LABELS[row.entity_type] || row.entity_type}</td><td class="p-3">${row.record_id}</td><td class="p-3">${row.reason || "—"}</td><td class="p-3">${row.archived_by_name || "—"}</td><td class="p-3">${row.archived_at ? new Date(row.archived_at).toLocaleString("ar-EG") : "—"}</td><td class="p-3"><button type="button" data-archive-restore="${row.id}" class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg">استعادة</button></td></tr>`).join("")}</tbody></table></div>`; }
    catch (error) { console.error(error); body.innerHTML = `<div class="py-12 text-center text-red-600">${error?.message || "فشل تحميل الأرشيف"}</div>`; }
  }

  async function restoreRecord(id) {
    let confirmed = true; if (global.Swal?.fire) { const result = await global.Swal.fire({ title: "تأكيد الاستعادة", text: "سيعود السجل إلى السجلات النشطة.", icon: "question", showCancelButton: true, confirmButtonText: "استعادة", cancelButtonText: "إلغاء", reverseButtons: true }); confirmed = result.isConfirmed; } else confirmed = global.confirm("سيعود السجل إلى السجلات النشطة."); if (!confirmed) return;
    try { const result = await global.api.put(`/archive/${id}/restore`, {}); toast(result?.message || "تمت الاستعادة بنجاح", true); await loadArchiveRecords(); } catch (error) { console.error(error); toast(error?.message || "فشل استعادة السجل", false); }
  }

  function openArchiveModal() { if (!isAdmin()) return toast("ليس لديك صلاحية للوصول إلى الأرشيف", false); const modal = createArchiveModal(); modal.classList.remove("hidden"); modal.classList.add("flex"); state.activeType = ""; updateArchiveFilterStyles(); loadArchiveRecords(); }
  function closeArchiveModal() { if (!state.modal) return; state.modal.classList.add("hidden"); state.modal.classList.remove("flex"); }

  function addArchiveLinkToSidebar() {
    if (!isAdmin()) return; const sidebar = document.getElementById("sidebar"); if (!sidebar || sidebar.querySelector('[data-page="archive"]')) return; const nav = sidebar.querySelector("nav") || sidebar.querySelector(".sidebar-nav"); if (!nav) return;
    const link = document.createElement("a"); link.href = "#archive"; link.dataset.page = "archive"; link.className = "sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg transition"; link.innerHTML = '<i data-lucide="archive"></i><span>الأرشيف</span>'; link.addEventListener("click", (event) => { event.preventDefault(); openArchiveModal(); }); nav.appendChild(link); if (global.lucide?.createIcons) global.lucide.createIcons();
  }

  function initialize() { addArchiveLinkToSidebar(); addProfileArchiveButton(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true }); else initialize();
  const sidebarContainer = document.getElementById("sidebar-container");
  if (sidebarContainer) new MutationObserver(() => { addArchiveLinkToSidebar(); addProfileArchiveButton(); }).observe(sidebarContainer, { childList: true, subtree: true });
  global.WathiqaArchiveUI = Object.freeze({ archiveRecord, openArchiveModal, closeArchiveModal, initialize });
})(window);

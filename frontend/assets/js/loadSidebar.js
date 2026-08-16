"use strict";

(function (global) {
  const CONFIG = Object.freeze({
    sidebarPath: "../components/sidebar.html",
    badgeEndpoint: "/notifications/unread-count",
    badgeIds: Object.freeze([
      "sidebar-notifications-badge",
      "navbar-notifications-badge",
    ]),
    lucidePath: "../assets/vendor/lucide/lucide.js",
    canonicalCssPath: "../assets/css/dashboard-shell.css",
  });

  function ensureCanonicalStylesheet() {
    if (document.querySelector(`link[href="${CONFIG.canonicalCssPath}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CONFIG.canonicalCssPath;
    document.head.appendChild(link);
  }

  function applyLegacyRtlShellFix() {
    const page = (global.location.pathname.split("/").pop() || "").split("?")[0].split("#")[0];
    if (page !== "revenues.html" && page !== "reports.html") return;
    if (document.getElementById("wathiqa-legacy-rtl-shell-fix")) return;

    const style = document.createElement("style");
    style.id = "wathiqa-legacy-rtl-shell-fix";
    style.textContent = `
      html { direction: rtl !important; }
      body { direction: rtl !important; text-align: right !important; }

      body:has(> .flex > #sidebar-container) > .flex {
        direction: ltr !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 280px !important;
        grid-template-rows: 72px minmax(0, 1fr) !important;
        grid-template-areas: "navbar sidebar" "main sidebar" !important;
        width: 100% !important;
        min-width: 0 !important;
        min-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #f8f6f2 !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > #navbar-container {
        grid-area: navbar !important;
        direction: rtl !important;
        width: 100% !important;
        height: 72px !important;
        min-width: 0 !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 300 !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > #sidebar-container {
        grid-area: sidebar !important;
        direction: rtl !important;
        width: 280px !important;
        min-width: 280px !important;
        height: 100vh !important;
        min-height: 100vh !important;
        position: sticky !important;
        top: 0 !important;
        align-self: start !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > #sidebar-container > #sidebar {
        direction: rtl !important;
        width: 280px !important;
        height: 100vh !important;
        position: sticky !important;
        top: 0 !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > main {
        grid-area: main !important;
        direction: rtl !important;
        text-align: right !important;
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        min-height: calc(100vh - 72px) !important;
        margin: 0 !important;
        background: #f8f6f2 !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > main table {
        direction: rtl !important;
        width: 100% !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > main th,
      body:has(> .flex > #sidebar-container) > .flex > main td {
        direction: rtl !important;
        text-align: right !important;
        vertical-align: middle !important;
      }

      body:has(> .flex > #sidebar-container) > .flex > main input,
      body:has(> .flex > #sidebar-container) > .flex > main textarea,
      body:has(> .flex > #sidebar-container) > .flex > main select {
        direction: rtl !important;
        text-align: right !important;
      }

      @media (max-width: 768px) {
        body:has(> .flex > #sidebar-container) > .flex {
          display: block !important;
          min-height: 100vh !important;
        }
        body:has(> .flex > #sidebar-container) > .flex > #sidebar-container {
          width: 0 !important;
          min-width: 0 !important;
        }
        body:has(> .flex > #sidebar-container) > .flex > main {
          width: 100% !important;
          max-width: 100% !important;
          min-height: 100vh !important;
        }
        body:has(> .flex > #sidebar-container) > .flex > #sidebar-container > #sidebar {
          position: fixed !important;
          top: 0 !important;
          right: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyServiceArchivePlacement() {
    const page = (global.location.pathname.split("/").pop() || "").split("?")[0].split("#")[0];
    if (page !== "service-profile.html") return;

    const button = Array.from(document.querySelectorAll("button, a")).find((element) =>
      /أرشفة الخدمة/.test((element.textContent || "").replace(/\s+/g, " ").trim()),
    );
    if (!button) return;

    const title = document.getElementById("serviceTitle");
    const main = title?.closest("main");
    if (!main) return;

    let actions = main.querySelector("#service-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.id = "service-actions";
      actions.className = "flex flex-wrap items-center gap-2 mb-6";
      title.insertAdjacentElement("afterend", actions);

      const edit = document.getElementById("editServiceBtn");
      const remove = document.getElementById("deleteServiceBtn");
      if (edit) actions.appendChild(edit);
      if (remove) actions.appendChild(remove);
    }

    if (button.parentElement !== actions) actions.appendChild(button);
    button.classList.add("bg-orange-600", "text-white", "px-4", "py-2", "rounded");
    button.style.position = "static";
    button.style.margin = "0";
    button.style.float = "none";
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} جنيه`;
  }

  async function loadRevenueInvoices() {
    const page = (global.location.pathname.split("/").pop() || "").split("?")[0].split("#")[0];
    if (page !== "revenues.html" || !global.api) return;

    const content = document.getElementById("contentState");
    if (!content || document.getElementById("invoice-revenue-summary")) return;

    try {
      const rows = await global.api.get("/invoices");
      const invoices = Array.isArray(rows) ? rows : [];
      if (document.getElementById("invoice-revenue-summary")) return;

      const total = invoices.reduce((sum, row) => sum + Number(row.total || 0), 0);
      const paid = invoices.reduce((sum, row) => sum + Number(row.paid || 0), 0);
      const remaining = invoices.reduce((sum, row) => sum + Number(row.remaining || 0), 0);
      const statusCount = {
        issued: invoices.filter((row) => row.computed_status === "issued" || row.status === "issued").length,
        partial: invoices.filter((row) => row.computed_status === "partial" || row.status === "partial").length,
        paid: invoices.filter((row) => row.computed_status === "paid" || row.status === "paid").length,
        cancelled: invoices.filter((row) => row.status === "cancelled").length,
      };

      const section = document.createElement("section");
      section.id = "invoice-revenue-summary";
      section.className = "bg-white rounded-2xl shadow p-6 mb-6";
      section.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 class="text-xl font-bold">بيانات الفواتير</h2>
            <p class="text-sm text-gray-500 mt-1">ملخص الفواتير الصادرة والتحصيلات المرتبطة بها.</p>
          </div>
          <button type="button" id="openRevenueInvoices" class="bg-[#1f2a44] text-white px-4 py-2 rounded-xl">إدارة الفواتير</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="rounded-xl bg-gray-50 p-4"><p class="text-gray-500 text-sm">عدد الفواتير</p><p class="text-2xl font-bold mt-1">${invoices.length.toLocaleString("ar-EG")}</p></div>
          <div class="rounded-xl bg-blue-50 p-4"><p class="text-gray-500 text-sm">إجمالي الفواتير</p><p class="text-2xl font-bold mt-1">${money(total)}</p></div>
          <div class="rounded-xl bg-green-50 p-4"><p class="text-gray-500 text-sm">المحصل من الفواتير</p><p class="text-2xl font-bold text-green-700 mt-1">${money(paid)}</p></div>
          <div class="rounded-xl bg-red-50 p-4"><p class="text-gray-500 text-sm">المتبقي من الفواتير</p><p class="text-2xl font-bold text-red-600 mt-1">${money(remaining)}</p></div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div class="border rounded-xl p-3 text-center"><span class="text-sm text-gray-500">صادرة</span><strong class="block mt-1">${statusCount.issued}</strong></div>
          <div class="border rounded-xl p-3 text-center"><span class="text-sm text-gray-500">جزئية</span><strong class="block mt-1">${statusCount.partial}</strong></div>
          <div class="border rounded-xl p-3 text-center"><span class="text-sm text-gray-500">مدفوعة</span><strong class="block mt-1">${statusCount.paid}</strong></div>
          <div class="border rounded-xl p-3 text-center"><span class="text-sm text-gray-500">ملغاة</span><strong class="block mt-1">${statusCount.cancelled}</strong></div>
        </div>
        <div class="mt-5 border-t pt-5">
          <h3 class="font-bold mb-3">آخر الفواتير</h3>
          <div class="space-y-2">
            ${invoices.slice(0, 5).map((row) => `<div class="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-3"><div><strong>${String(row.invoice_number || "—")}</strong><div class="text-sm text-gray-500">${String(row.client_name || "—")}</div></div><div class="text-sm">${money(row.total)} — ${String(row.computed_status || row.status || "—")}</div></div>`).join("") || '<div class="text-gray-500">لا توجد فواتير.</div>'}
          </div>
        </div>`;

      const heading = Array.from(content.querySelectorAll("h2")).find((element) => element.textContent.trim() === "إجمالي الموكلين");
      const anchor = heading?.closest("section");
      if (anchor) anchor.insertAdjacentElement("beforebegin", section);
      else content.prepend(section);

      document.getElementById("openRevenueInvoices")?.addEventListener("click", () => {
        if (global.WathiqaInvoiceUI?.open) global.WathiqaInvoiceUI.open("list");
      });
    } catch (error) {
      console.error("Unable to load revenue invoice summary:", error);
    }
  }

  function applyPageFixes() {
    applyServiceArchivePlacement();
    loadRevenueInvoices();
  }

  ensureCanonicalStylesheet();
  applyLegacyRtlShellFix();

  const state = {
    sidebarHtml: null,
    loadingPromise: null,
    abortController: null,
    container: null,
    elements: Object.seal({
      sidebar: null,
      logoutButton: null,
      badges: [],
      navLinks: [],
      officeName: null,
      officeRole: null,
    }),
  };

  Object.seal(state);

  function $(id) {
    return document.getElementById(id);
  }

  function normalizePage(pathname) {
    const page = pathname.split("/").pop() || "";
    return page.split("?")[0].split("#")[0];
  }

  function cacheElements() {
    state.elements.sidebar = $("sidebar");
    state.elements.navLinks = Array.from(
      state.elements.sidebar?.querySelectorAll(".sidebar-link") || [],
    );
    state.elements.logoutButton = document.querySelector(
      '#sidebar [data-action="logout"]',
    );
    state.elements.badges = CONFIG.badgeIds.map($).filter(Boolean);
    state.elements.officeName = $("sidebar-office-name");
    state.elements.officeRole = $("sidebar-office-role");
  }

  function clearElements() {
    state.elements.sidebar = null;
    state.elements.logoutButton = null;
    state.elements.badges = [];
    state.elements.navLinks = [];
    state.elements.officeName = null;
    state.elements.officeRole = null;
  }

  function abortRequest() {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }
  }

  function createAbortController() {
    abortRequest();
    const controller = new AbortController();
    state.abortController = controller;
    return controller;
  }

  function highlightActiveLink() {
    if (!state.elements.sidebar) return;

    const currentPage = normalizePage(global.location.pathname).replace(
      ".html",
      "",
    );

    state.elements.navLinks.forEach((link) => {
      const active = (link.dataset.page || "") === currentPage;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  async function fetchSidebar() {
    if (state.sidebarHtml) return state.sidebarHtml;

    const controller = createAbortController();
    try {
      const response = await fetch(CONFIG.sidebarPath, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Failed to load sidebar.");
      state.sidebarHtml = await response.text();
      return state.sidebarHtml;
    } finally {
      if (state.abortController === controller) state.abortController = null;
    }
  }

  function attachEvents() {
    if (!state.elements.logoutButton) return;
    detachEvents();
    state.elements.logoutButton.addEventListener("click", auth.logout);
  }

  function detachEvents() {
    if (state.elements.logoutButton) {
      state.elements.logoutButton.removeEventListener("click", auth.logout);
    }
  }

  async function ensureLucide() {
    if (typeof global.lucide !== "undefined") return;

    const existing = document.querySelector(
      `script[src="${CONFIG.lucidePath}"]`,
    );

    if (existing) {
      await new Promise((resolve, reject) => {
        if (typeof global.lucide !== "undefined") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Unable to load Lucide.")),
          { once: true },
        );
      });
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CONFIG.lucidePath;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load Lucide."));
      document.head.appendChild(script);
    });
  }

  async function refreshNotificationBadge() {
    if (!state.elements.badges.length) return;

    try {
      const { count = 0 } = await api.get(CONFIG.badgeEndpoint);
      state.elements.badges.forEach((badge) => {
        badge.textContent = count;
        badge.classList.toggle("d-none", count === 0);
        badge.setAttribute(
          "aria-label",
          count > 0 ? `${count} إشعار غير مقروء` : "لا توجد إشعارات",
        );
      });
    } catch (error) {
      console.error("Unable to refresh notification badge.", error);
    }
  }

  function refreshOfficeInformation(office) {
    updateOfficeInformation(office);
  }

  async function initializeSidebar() {
    cacheElements();
    highlightActiveLink();
    attachEvents();
    updateOfficeInformation(global.__APP_DATA__?.office);

    try {
      await ensureLucide();
      if (typeof global.lucide !== "undefined") global.lucide.createIcons();
    } catch (error) {
      console.error("Unable to initialize Lucide icons.", error);
    }

    await refreshNotificationBadge();
    applyPageFixes();
  }

  function updateOfficeInformation(office) {
    if (!state.elements.officeName || !office) return;
    state.elements.officeName.textContent = office.officeName ?? "";
    state.elements.officeRole.textContent =
      office.ownerName ?? office.role ?? "";
  }

  async function loadSidebar() {
    if (state.loadingPromise) return state.loadingPromise;

    state.loadingPromise = (async () => {
      const container = $("sidebar-container");
      if (!container) throw new Error("Sidebar container not found.");

      state.container = container;

      if (
        state.elements.sidebar &&
        state.container.contains(state.elements.sidebar)
      ) {
        highlightActiveLink();
        applyPageFixes();
        return;
      }

      try {
        const html = await fetchSidebar();
        container.innerHTML = html;
        await initializeSidebar();
      } finally {
        state.loadingPromise = null;
      }
    })();

    return state.loadingPromise;
  }

  function destroy() {
    abortRequest();
    detachEvents();
    clearElements();
    if (state.container) state.container.innerHTML = "";
    state.container = null;
    state.loadingPromise = null;
  }

  global.Sidebar = Object.freeze({
    load: loadSidebar,
    reload() {
      destroy();
      return loadSidebar();
    },
    destroy,
    refreshNotificationBadge,
    refreshOfficeInformation,
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadSidebar().catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Sidebar loading failed:", error);
      }
    });
    applyPageFixes();
    const observer = new MutationObserver(() => applyPageFixes());
    observer.observe(document.body, { childList: true, subtree: true });
  });
})(window);

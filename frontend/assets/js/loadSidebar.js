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
  });
})(window);

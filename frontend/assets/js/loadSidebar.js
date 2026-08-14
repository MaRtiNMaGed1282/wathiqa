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
  });

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

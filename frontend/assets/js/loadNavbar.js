"use strict";

(function (global) {
  const CONFIG = Object.freeze({
    navbarPath: "../components/navbar.html",
    globalSearchScript: "../assets/js/globalSearch.js",
    userPermissionsScript: "../assets/js/user-permissions.js",
    sharedStylesheet: "../assets/css/input.css",
    searchEndpoint: "/search",
    searchDebounce: 300,
    searchMinCharacters: 2,
  });

  const state = Object.seal({
    container: null,
    navbarHtml: null,
    loadingPromise: null,
    abortController: null,
    globalSearchInitialized: false,
    dashboardObserver: null,
    elements: Object.seal({
      navbar: null,
      userButton: null,
      userMenu: null,
      logoutButton: null,
      notificationButton: null,
      notificationBadge: null,
      searchInput: null,
      searchResults: null,
      userName: null,
      userRole: null,
    }),
  });

  function $(id) { return document.getElementById(id); }

  function ensureSharedStyles() {
    const existing = document.querySelector(`link[data-wathiqa-shared-styles="true"]`);
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CONFIG.sharedStylesheet;
    link.dataset.wathiqaSharedStyles = "true";
    document.head.appendChild(link);
  }

  function createDashboardDocumentAction() {
    const button = document.createElement("button");
    button.id = "action-upload-document";
    button.type = "button";
    button.className = "group card bg-white rounded-3xl border border-gray-100 p-6 transition-all hover:-translate-y-1 hover:shadow-xl";
    button.innerHTML = `
      <div class="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-700">
        <i data-lucide="file-plus"></i>
      </div>
      <h3 class="mt-5 font-bold text-lg">مستند</h3>
      <p class="text-sm text-gray-500 mt-2">رفع مستند</p>
    `;
    return button;
  }

  function ensureDashboardQuickActions() {
    const section = $("dashboard-quick-actions");
    if (!section) return;

    const grid = section.querySelector(":scope > .grid");
    if (!grid || $("action-upload-document")) return;

    grid.appendChild(createDashboardDocumentAction());
    if (typeof global.lucide !== "undefined") global.lucide.createIcons();
  }

  function initializeDashboardQuickActionRepair() {
    if (!$("dashboard-quick-actions")) return;

    ensureDashboardQuickActions();

    if (state.dashboardObserver) state.dashboardObserver.disconnect();
    state.dashboardObserver = new MutationObserver(() => ensureDashboardQuickActions());
    state.dashboardObserver.observe($("dashboard-quick-actions"), {
      childList: true,
      subtree: true,
    });
  }

  function handleDashboardQuickActionCapture(event) {
    const action = event.target.closest("#action-search, #action-upload-document");
    if (!action) return;

    if (action.id === "action-search") {
      event.preventDefault();
      event.stopPropagation();
      const input = $("headerSearchInput");
      if (input) {
        input.focus();
        input.select();
      }
      return;
    }

    if (action.id === "action-upload-document") {
      event.preventDefault();
      event.stopPropagation();
      global.location.href = "documents.html";
    }
  }

  function cacheElements() {
    state.elements.navbar = $("navbar");
    state.elements.userButton = document.querySelector('[data-action="toggle-user-menu"]');
    state.elements.userMenu = $("userMenu");
    state.elements.logoutButton = document.querySelector('[data-action="logout"]');
    state.elements.notificationButton = document.querySelector('[data-action="toggle-notifications"]');
    state.elements.notificationBadge = $("navbar-notifications-badge");
    state.elements.searchInput = $("headerSearchInput");
    state.elements.searchResults = $("headerSearchResults");
    state.elements.userName = $("navbar-user-name");
    state.elements.userRole = $("navbar-user-role");
  }

  function clearElements() { Object.keys(state.elements).forEach((key) => { state.elements[key] = null; }); }

  function abortRequest() {
    if (!state.abortController) return;
    state.abortController.abort();
    state.abortController = null;
  }

  function createAbortController() {
    abortRequest();
    state.abortController = new AbortController();
    return state.abortController;
  }

  async function fetchNavbar() {
    if (state.navbarHtml) return state.navbarHtml;
    const controller = createAbortController();
    try {
      const response = await fetch(CONFIG.navbarPath, { signal: controller.signal });
      if (!response.ok) throw new Error("Failed to load navbar.");
      state.navbarHtml = await response.text();
      return state.navbarHtml;
    } finally {
      if (state.abortController === controller) state.abortController = null;
    }
  }

  async function loadNavbar() {
    if (state.loadingPromise) return state.loadingPromise;
    state.loadingPromise = (async () => {
      state.container = $("navbar-container");
      if (!state.container) throw new Error("Navbar container not found.");
      ensureSharedStyles();
      if (state.elements.navbar && state.container.contains(state.elements.navbar)) return;
      state.container.innerHTML = await fetchNavbar();
      await initializeNavbar();
    })();
    try { return await state.loadingPromise; } finally { state.loadingPromise = null; }
  }

  async function initializeNavbar() {
    cacheElements();
    initializeIcons();
    attachEvents();
    refreshUserInformation(global.__APP_DATA__);
    refreshNotificationBadge(global.__APP_DATA__?.dashboard?.summary?.notifications ?? 0);
    await initializeGlobalSearch();
    await initializeUserPermissions();
    initializeDashboardQuickActionRepair();
  }

  function initializeIcons() { if (typeof lucide !== "undefined") lucide.createIcons(); }

  function attachEvents() {
    detachEvents();
    document.addEventListener("click", handleDashboardQuickActionCapture, true);
    document.addEventListener("click", handleClick);
    document.addEventListener("click", closeMenus);
  }

  function detachEvents() {
    document.removeEventListener("click", handleDashboardQuickActionCapture, true);
    document.removeEventListener("click", handleClick);
    document.removeEventListener("click", closeMenus);
  }

  function handleClick(event) {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    switch (action) {
      case "toggle-user-menu":
        event.preventDefault(); event.stopPropagation(); toggleUserMenu(); break;
      case "toggle-notifications":
        event.preventDefault(); openNotifications(); break;
      case "logout":
        event.preventDefault();
        if (typeof auth !== "undefined" && typeof auth.logout === "function") auth.logout();
        break;
    }
  }

  function toggleUserMenu() {
    if (!state.elements.userMenu || !state.elements.userButton) return;
    const isOpen = state.elements.userMenu.classList.toggle("show");
    state.elements.userButton.setAttribute("aria-expanded", String(isOpen));
  }

  function closeMenus(event) {
    if (!state.elements.userMenu || !state.elements.userButton) return;
    if (event && state.elements.userButton.contains(event.target)) return;
    if (event && state.elements.userMenu.contains(event.target)) return;
    state.elements.userMenu.classList.remove("show");
    state.elements.userButton.setAttribute("aria-expanded", "false");
  }

  function openNotifications() { global.location.href = "notifications.html"; }

  async function initializeGlobalSearch() {
    if (state.globalSearchInitialized) return;
    if (!state.elements.searchInput || !state.elements.searchResults) return;
    if (!global.GlobalSearch) await loadScript(CONFIG.globalSearchScript, "GlobalSearch");
    if (!global.GlobalSearch || typeof global.GlobalSearch.init !== "function") return;
    global.GlobalSearch.init({
      inputId: state.elements.searchInput.id,
      resultsId: state.elements.searchResults.id,
      endpoint: CONFIG.searchEndpoint,
      debounce: CONFIG.searchDebounce,
      minChars: CONFIG.searchMinCharacters,
    });
    state.globalSearchInitialized = true;
  }

  async function initializeUserPermissions() {
    if (!/\/users\.html$/i.test(global.location.pathname)) return;
    if (global.auth?.getUser?.()?.role !== "admin") return;
    try { await loadScript(CONFIG.userPermissionsScript, "__WATHIQA_USER_PERMISSIONS_LOADED__"); } catch (error) { console.error("[Users] Failed to load permissions UI:", error); }
  }

  function loadScript(src, globalMarker) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return waitForScript(existing, globalMarker);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Unable to load ${src}.`));
      document.head.appendChild(script);
    });
  }

  function waitForScript(script, globalMarker) {
    if (!globalMarker || global[globalMarker]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Unable to load script.")), { once: true });
    });
  }

  function refreshUserInformation(data) {
    if (!data) return;
    const office = data.office ?? {};
    const user = data.user ?? {};
    if (state.elements.userName) state.elements.userName.textContent = user.fullName || office.officeName || "المستخدم";
    if (state.elements.userRole) state.elements.userRole.textContent = user.roleName || office.roleName || "مدير المكتب";
  }

  function refreshNotificationBadge(count = 0) {
    if (!state.elements.notificationBadge) return;
    state.elements.notificationBadge.textContent = count;
    state.elements.notificationBadge.classList.toggle("d-none", count <= 0);
  }

  function destroy() {
    abortRequest();
    detachEvents();
    if (state.dashboardObserver) {
      state.dashboardObserver.disconnect();
      state.dashboardObserver = null;
    }
    clearElements();
    if (state.container) state.container.innerHTML = "";
    state.container = null; state.navbarHtml = null; state.loadingPromise = null; state.globalSearchInitialized = false;
  }

  global.Navbar = Object.freeze({ load: loadNavbar, async reload() { destroy(); return loadNavbar(); }, destroy, refreshUserInformation, refreshNotificationBadge });

  function bootstrap() { loadNavbar().catch(handleBootstrapError); }
  function handleBootstrapError(error) { if (error?.name !== "AbortError") console.error("[Navbar] Failed to initialize:", error); }
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
})(window);

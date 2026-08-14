(function (global) {
  "use strict";

  function isCasesPage() {
    return /(?:^|\/)cases\.html$/i.test(global.location.pathname);
  }

  function initCasesFilter() {
    if (!isCasesPage()) return;

    const heading = Array.from(document.querySelectorAll("h3")).find(
      (node) => node.textContent.trim() === "تصفية القضايا",
    );
    if (!heading || heading.dataset.collapseReady === "true") return;

    const card = heading.closest(".bg-white.shadow.rounded-lg.p-4.mb-6");
    if (!card) return;

    heading.dataset.collapseReady = "true";
    const content = document.createElement("div");
    content.className = "mt-4";
    content.hidden = true;

    while (heading.nextSibling) {
      content.appendChild(heading.nextSibling);
    }

    const header = document.createElement("div");
    header.className = "flex items-center justify-between gap-4";
    heading.parentNode.insertBefore(header, heading);
    header.appendChild(heading);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-secondary transition";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "cases-filter-content");
    toggle.innerHTML = '<span>عرض الفلاتر</span><span aria-hidden="true">⌄</span>';

    content.id = "cases-filter-content";
    header.appendChild(toggle);

    toggle.addEventListener("click", () => {
      const expanded = !content.hidden;
      content.hidden = expanded;
      toggle.setAttribute("aria-expanded", String(!expanded));
      toggle.firstElementChild.textContent = expanded ? "عرض الفلاتر" : "إخفاء الفلاتر";
      toggle.lastElementChild.textContent = expanded ? "⌄" : "⌃";
    });

    card.appendChild(content);
  }

  async function loadOfficeInformation() {
    if (!global.auth?.isAuthenticated?.()) return;
    if (!global.api || typeof global.api.get !== "function") return;

    try {
      const office = await global.api.get("/office");
      if (!office || typeof office !== "object") return;

      global.__APP_DATA__ = global.__APP_DATA__ || {};
      global.__APP_DATA__.office = office;

      const name = document.getElementById("sidebar-office-name");
      const role = document.getElementById("sidebar-office-role");
      if (name) name.textContent = office.office_name || "مكتب المحاماة";
      if (role) role.textContent = office.owner_name || "مدير المكتب";

      const navbarName = document.getElementById("navbar-user-name");
      const navbarRole = document.getElementById("navbar-user-role");
      if (navbarName && !navbarName.textContent.trim()) {
        navbarName.textContent = office.office_name || "المستخدم";
      }
      if (navbarRole && !navbarRole.textContent.trim()) {
        navbarRole.textContent = office.owner_name || "مدير المكتب";
      }
    } catch (error) {
      console.error("Unable to load office information.", error);
    }
  }

  function applyAdminNavigation() {
    const usersLink = document.querySelector('[data-page="users"][data-admin-only]');
    if (!usersLink) return false;
    const isAdmin = global.auth?.getUser?.()?.role === "admin";
    usersLink.hidden = !isAdmin;
    usersLink.setAttribute("aria-hidden", String(!isAdmin));
    return true;
  }

  function getAuthenticatedFileEndpoint(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return null;
    const normalized = rawUrl.replace(/\\/g, "/");

    if (normalized.startsWith("/uploads/")) {
      const filename = normalized.slice("/uploads/".length);
      if (!filename) return null;
      return `/files/by-name/${encodeURIComponent(filename)}`;
    }

    if (normalized.startsWith("/attorney-files/")) {
      const filename = normalized.slice("/attorney-files/".length);
      if (!filename) return null;
      return `/attorneys/file-by-name/${encodeURIComponent(filename)}`;
    }

    return null;
  }

  async function openAuthenticatedFile(url, download = false, filename = "file") {
    if (!global.api?.download) return false;

    const endpoint = getAuthenticatedFileEndpoint(url);
    if (!endpoint) return false;

    try {
      const blob = await global.api.download(endpoint);
      const objectUrl = global.URL.createObjectURL(blob);

      if (download) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = filename || "file";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else if (typeof global.openPdfModal === "function") {
        global.openPdfModal(objectUrl);
      } else {
        global.open(objectUrl, "_blank", "noopener,noreferrer");
      }

      global.setTimeout(() => global.URL.revokeObjectURL(objectUrl), 60000);
      return true;
    } catch (error) {
      console.error("Authenticated file access failed.", error);
      return false;
    }
  }

  function initAuthenticatedFileAccess() {
    document.addEventListener(
      "click",
      async (event) => {
        const element = event.target?.closest?.("a,button");
        if (!element) return;

        const href = element.getAttribute("href");
        const onclick = element.getAttribute("onclick") || "";
        const directUrl =
          getAuthenticatedFileEndpoint(href) ? href :
          (onclick.match(/['\"](\/(?:uploads|attorney-files)\/[^'\"]+)['\"]/) || [])[1];

        if (!directUrl) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const filename =
          directUrl.split("/").pop() ||
          element.textContent.trim() ||
          "file";
        const download = element.hasAttribute("download") || /تحميل|download/i.test(element.textContent);

        const handled = await openAuthenticatedFile(directUrl, download, decodeURIComponent(filename));
        if (!handled) {
          console.error("Unable to open authenticated file.");
        }
      },
      true,
    );
  }

  function initializeShellData() {
    if (!document.getElementById("sidebar")) return false;
    applyAdminNavigation();
    loadOfficeInformation();
    return true;
  }

  function initialize() {
    initCasesFilter();
    initAuthenticatedFileAccess();

    if (initializeShellData()) return;

    const observer = new MutationObserver(() => {
      if (initializeShellData()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);

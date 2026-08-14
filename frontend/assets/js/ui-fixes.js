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
    if (!usersLink) return;
    const isAdmin = global.permissions?.isAdmin?.() === true;
    usersLink.hidden = !isAdmin;
    usersLink.setAttribute("aria-hidden", String(!isAdmin));
  }

  function initialize() {
    initCasesFilter();
    applyAdminNavigation();
    loadOfficeInformation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window);

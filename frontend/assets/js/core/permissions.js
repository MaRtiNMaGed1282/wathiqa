(function (global) {
  "use strict";

  function role() {
    return global.auth?.getUser?.()?.role || null;
  }

  function isAdmin() {
    return role() === "admin";
  }

  function isLawyer() {
    return role() === "lawyer";
  }

  function isAssistant() {
    return role() === "assistant";
  }

  function canDelete() {
    return isAdmin() || isLawyer();
  }

  function canViewFinancials() {
    return isAdmin() || isLawyer();
  }

  function canManageUsers() {
    return isAdmin();
  }

  function canEditOffice() {
    return isAdmin();
  }

  function canReadOwnNotifications() {
    return Boolean(global.auth?.isAuthenticated?.());
  }

  function applyFinancialVisibility(root = document) {
    const allowed = canViewFinancials();

    root.querySelectorAll("[data-financial-only]").forEach((element) => {
      element.hidden = !allowed;
    });
  }

  function applyAdminVisibility(root = document) {
    const allowed = isAdmin();

    root.querySelectorAll("[data-admin-only]").forEach((element) => {
      element.hidden = !allowed;
    });
  }

  function applyDeleteVisibility(root = document) {
    const allowed = canDelete();

    root.querySelectorAll("[data-delete-action]").forEach((element) => {
      element.hidden = !allowed;
    });
  }

  global.permissions = Object.freeze({
    role,
    isAdmin,
    isLawyer,
    isAssistant,
    canDelete,
    canViewFinancials,
    canManageUsers,
    canEditOffice,
    canReadOwnNotifications,
    applyFinancialVisibility,
    applyAdminVisibility,
    applyDeleteVisibility,
  });
})(window);

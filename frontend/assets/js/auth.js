(function (global) {
  "use strict";

  const ROUTES = Object.freeze({
    LOGIN: "login.html",
    DASHBOARD: "dashboard.html",
    CHANGE_PASSWORD: "change-password.html",
  });

  const STORAGE_KEYS = Object.freeze({
    TOKEN: "token",
    USER: "user",
  });

  function getToken() {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      else localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch {}
  }

  function removeToken() {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch {}
  }

  function getUser() {
    try {
      const value = localStorage.getItem(STORAGE_KEYS.USER);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function setUser(user) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user || {}));
    } catch {}
  }

  function removeUser() {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
  }

  function clearSession() {
    try {
      removeToken();
      removeUser();
      sessionStorage.clear();
    } catch {}
  }

  function decodeJwt(token) {
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  function getTokenPayload(token = getToken()) {
    return token ? decodeJwt(token) : null;
  }

  function isTokenExpired(token = getToken()) {
    if (!token) return true;

    const payload = decodeJwt(token);
    if (!payload) return true;
    if (!payload.exp) return false;

    return Date.now() >= payload.exp * 1000;
  }

  function getCurrentRole() {
    return getUser()?.role || getTokenPayload()?.role || null;
  }

  function hasRole(...roles) {
    const role = getCurrentRole();
    return Boolean(role) && roles.includes(role);
  }

  function isAdmin() {
    return hasRole("admin");
  }

  function isLawyer() {
    return hasRole("lawyer");
  }

  function isAssistant() {
    return hasRole("assistant", "secretary");
  }

  // Frozen architecture: destructive deletion of clients/cases/services/files
  // is Admin-only unless the page-specific frozen permission explicitly allows
  // Lawyer deletion (service files are Admin/Lawyer deletable).
  function canDelete() {
    return isAdmin();
  }

  function canViewFinancials() {
    return isAdmin() || isLawyer();
  }

  function canManageUsers() {
    return isAdmin();
  }

  function mustChangePassword() {
    return Boolean(getUser()?.must_change_password);
  }

  function isAuthenticated() {
    const token = getToken();

    if (!token || isTokenExpired(token)) {
      clearSession();
      return false;
    }

    return true;
  }

  function isChangePasswordPage() {
    return global.location.pathname.endsWith(ROUTES.CHANGE_PASSWORD);
  }

  function redirectToLogin() {
    if (!global.location.pathname.endsWith(ROUTES.LOGIN)) {
      global.location.replace(ROUTES.LOGIN);
    }
  }

  function redirectToChangePassword() {
    if (!isChangePasswordPage()) {
      global.location.replace(ROUTES.CHANGE_PASSWORD);
    }
  }

  function hideCaseFinancialSections() {
    if (!isAssistant()) return;

    const financialAnchor = global.document.getElementById("totalFees");
    if (financialAnchor) {
      const section = financialAnchor.closest(".bg-white.shadow.rounded.p-6");
      if (section) section.hidden = true;
    }

    ["paymentsContainer", "expensesContainer"].forEach((id) => {
      const container = global.document.getElementById(id);
      if (!container) return;

      const section = container.closest(".bg-white.shadow.rounded.p-6");
      if (section) section.hidden = true;
    });

    ["openPaymentModal", "openExpenseModal"].forEach((name) => {
      global.document
        .querySelectorAll(`[onclick*="${name}"]`)
        .forEach((element) => element.remove());
    });
  }

  function applyRoleVisibility() {
    if (!global.document) return;

    const run = () => {
      if (global.location.pathname.endsWith("case-profile.html")) {
        hideCaseFinancialSections();
      }
    };

    if (global.document.readyState === "loading") {
      global.document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      redirectToLogin();
      return false;
    }

    if (mustChangePassword() && !isChangePasswordPage()) {
      redirectToChangePassword();
      return false;
    }

    return true;
  }

  function requireRole(...roles) {
    if (!requireAuth()) return false;
    return hasRole(...roles);
  }

  function logout() {
    clearSession();
    redirectToLogin();
  }

  global.auth = Object.freeze({
    getToken,
    setToken,
    removeToken,
    getUser,
    setUser,
    removeUser,
    clearSession,
    decodeJwt,
    getTokenPayload,
    isTokenExpired,
    getCurrentRole,
    hasRole,
    isAdmin,
    isLawyer,
    isAssistant,
    canDelete,
    canViewFinancials,
    canManageUsers,
    mustChangePassword,
    isAuthenticated,
    requireAuth,
    requireRole,
    logout,
  });

  const isLoginPage = global.location.pathname.endsWith(ROUTES.LOGIN);

  if (isLoginPage) {
    if (isAuthenticated()) {
      if (mustChangePassword()) redirectToChangePassword();
      else global.location.replace(ROUTES.DASHBOARD);
    }
  } else if (!isChangePasswordPage()) {
    requireAuth();
  }

  applyRoleVisibility();

  // service-profile.html currently contains legacy case-file JavaScript.
  // Load the frozen service-file subsystem after that legacy script has run;
  // the subsystem replaces the input listener and uses the service-file API.
  if (global.location.pathname.endsWith("service-profile.html")) {
    global.setTimeout(() => {
      const script = global.document.createElement("script");
      script.src = "../assets/js/service-files.js";
      script.defer = true;
      global.document.head.appendChild(script);
    }, 0);
  }
})(window);

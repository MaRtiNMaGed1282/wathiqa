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

    // A malformed token is not considered a valid authenticated session.
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

  function canDelete() {
    return isAdmin() || isLawyer();
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
})(window);

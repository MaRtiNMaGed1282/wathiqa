(function (global) {
  "use strict";

  const ROUTES = Object.freeze({
    LOGIN: "login.html",
    DASHBOARD: "dashboard.html",
    CHANGE_PASSWORD: "change-password.html",
  });
  const STORAGE_KEYS = Object.freeze({ TOKEN: "token", USER: "user" });

  function getToken() { try { return localStorage.getItem(STORAGE_KEYS.TOKEN); } catch { return null; } }
  function setToken(token) { try { localStorage.setItem(STORAGE_KEYS.TOKEN, token); } catch {} }
  function removeToken() { try { localStorage.removeItem(STORAGE_KEYS.TOKEN); } catch {} }
  function removeUser() { try { localStorage.removeItem(STORAGE_KEYS.USER); } catch {} }
  function getUser() { try { const value = localStorage.getItem(STORAGE_KEYS.USER); return value ? JSON.parse(value) : null; } catch { return null; } }
  function setUser(user) { try { localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)); } catch {} }
  function clearSession() { try { removeToken(); removeUser(); sessionStorage.clear(); } catch {} }
  function decodeJwt(token) { try { const payload = token.split(".")[1]; const normalized = payload.replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(normalized)); } catch { return null; } }
  function isTokenExpired(token = getToken()) { if (!token) return true; const payload = decodeJwt(token); if (!payload?.exp) return false; return Date.now() >= payload.exp * 1000; }
  function redirectToLogin() { global.location.replace(ROUTES.LOGIN); }
  function isAuthenticated() { const token = getToken(); if (!token) return false; if (isTokenExpired(token)) { clearSession(); return false; } return true; }
  function requireAuth() { if (!isAuthenticated()) { redirectToLogin(); return false; } return true; }
  function hasRole(...roles) { const user = getUser(); return !!user && roles.includes(user.role); }
  function logout() { clearSession(); redirectToLogin(); }

  global.auth = Object.freeze({ getToken, setToken, removeToken, removeUser, getUser, setUser, clearSession, isTokenExpired, isAuthenticated, requireAuth, hasRole, logout });

  const pageName = (global.location.pathname.split("/").pop() || "").toLowerCase();
  const isLoginPage = pageName === ROUTES.LOGIN;
  const isChangePasswordPage = pageName === ROUTES.CHANGE_PASSWORD;

  if (isLoginPage) {
    if (isAuthenticated()) {
      const user = getUser();
      global.location.replace(user?.must_change_password ? ROUTES.CHANGE_PASSWORD : ROUTES.DASHBOARD);
    }
  } else if (!requireAuth()) {
    // Redirect handled by requireAuth().
  } else {
    const user = getUser();
    if (user?.must_change_password && !isChangePasswordPage) global.location.replace(ROUTES.CHANGE_PASSWORD);
    else if (isChangePasswordPage && !user?.must_change_password) global.location.replace(ROUTES.DASHBOARD);
  }

  [
    "wathiqa-ui.js",
    "phase25-state.js",
    "ui-fixes.js",
    "archive-ui.js",
    "invoice-ui.js",
    "invoice-fixes.js",
    "invoice-modal-fix.js",
  ].forEach((scriptName) => {
    const script = global.document.createElement("script");
    script.src = `../assets/js/${scriptName}`;
    script.async = false;
    global.document.head.appendChild(script);
  });
})(window);

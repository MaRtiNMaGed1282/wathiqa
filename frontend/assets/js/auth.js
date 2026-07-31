(function (global) {
  "use strict";

  const ROUTES = Object.freeze({
    LOGIN: "login.html",
    DASHBOARD: "dashboard.html",
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
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch {}
  }

  function removeToken() {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch {}
  }
  function removeUser() {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
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
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
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

      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");

      return JSON.parse(atob(normalized));
    } catch {
      return null;
    }
  }

  function isTokenExpired(token = getToken()) {
    if (!token) {
      return true;
    }

    const payload = decodeJwt(token);

    if (!payload?.exp) {
      return false;
    }

    return Date.now() >= payload.exp * 1000;
  }

  function redirectToLogin() {
    global.location.replace(ROUTES.LOGIN);
  }

  function isAuthenticated() {
    const token = getToken();

    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      clearSession();
      return false;
    }

    return true;
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      redirectToLogin();
      return false;
    }

    return true;
  }

  function hasRole(...roles) {
    const user = getUser();

    return !!user && roles.includes(user.role);
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
    clearSession,
    isTokenExpired,
    isAuthenticated,
    requireAuth,
    hasRole,
    logout,
  });

  const isLoginPage = global.location.pathname.endsWith(ROUTES.LOGIN);

  if (isLoginPage) {
    if (isAuthenticated()) {
      global.location.replace(ROUTES.DASHBOARD);
    }
  } else {
    requireAuth();
  }
})(window);

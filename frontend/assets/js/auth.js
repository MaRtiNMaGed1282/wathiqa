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
    REMEMBER_ME: "remember_me",
  });

  function getStorage(name) {
    try {
      return name === "session" ? global.sessionStorage : global.localStorage;
    } catch {
      return null;
    }
  }

  function getValue(key) {
    const local = getStorage("local");
    const session = getStorage("session");
    try {
      return local?.getItem(key) || session?.getItem(key) || null;
    } catch {
      return null;
    }
  }

  function getToken() {
    return getValue(STORAGE_KEYS.TOKEN);
  }

  function setToken(token, remember = true) {
    const local = getStorage("local");
    const session = getStorage("session");
    try {
      local?.removeItem(STORAGE_KEYS.TOKEN);
      session?.removeItem(STORAGE_KEYS.TOKEN);
      (remember ? local : session)?.setItem(STORAGE_KEYS.TOKEN, token);
      local?.setItem(STORAGE_KEYS.REMEMBER_ME, remember ? "1" : "0");
    } catch {}
  }

  function removeToken() {
    try {
      getStorage("local")?.removeItem(STORAGE_KEYS.TOKEN);
      getStorage("session")?.removeItem(STORAGE_KEYS.TOKEN);
    } catch {}
  }

  function removeUser() {
    try {
      getStorage("local")?.removeItem(STORAGE_KEYS.USER);
      getStorage("session")?.removeItem(STORAGE_KEYS.USER);
    } catch {}
  }

  function getUser() {
    try {
      const value = getValue(STORAGE_KEYS.USER);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function setUser(user, remember = true) {
    try {
      const local = getStorage("local");
      const session = getStorage("session");
      local?.removeItem(STORAGE_KEYS.USER);
      session?.removeItem(STORAGE_KEYS.USER);
      (remember ? local : session)?.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch {}
  }

  function setSession(token, user, remember = true) {
    setToken(token, remember);
    setUser(user, remember);
  }

  function clearSession() {
    try {
      removeToken();
      removeUser();
      getStorage("local")?.removeItem(STORAGE_KEYS.REMEMBER_ME);
      getStorage("session")?.clear();
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
    if (!token) return true;
    const payload = decodeJwt(token);
    if (!payload?.exp) return false;
    return Date.now() >= payload.exp * 1000;
  }

  function redirectToLogin() {
    global.location.replace(ROUTES.LOGIN);
  }

  function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
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
    removeUser,
    getUser,
    setUser,
    setSession,
    clearSession,
    isTokenExpired,
    isAuthenticated,
    requireAuth,
    hasRole,
    logout,
  });

  const pageName = (global.location.pathname.split("/").pop() || "").toLowerCase();
  const isLoginPage = pageName === ROUTES.LOGIN;
  const isChangePasswordPage = pageName === ROUTES.CHANGE_PASSWORD;

  if (isLoginPage) {
    // A session created without "تذكرني" must not survive a full application restart.
    try {
      if (global.localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) !== "1") {
        global.localStorage.removeItem(STORAGE_KEYS.TOKEN);
        global.localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {}

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
    "invoice-runtime-fix.js",
    "arabic-logs.js",
    "modal-required-policy.js",
  ].forEach((scriptName) => {
    const script = global.document.createElement("script");
    script.src = `../assets/js/${scriptName}`;
    script.async = false;
    global.document.head.appendChild(script);
  });
})(window);

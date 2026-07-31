"use strict";

(function (global) {
  const CONFIG = Object.freeze({});

  const state = {
    initialized: false,
  };

  Object.seal(state);
  async function initializeAuthentication() {
    if (!global.auth || typeof global.auth.requireAuth !== "function") {
      throw new Error("Authentication module is not available.");
    }

    await global.auth.requireAuth();
  }

  async function initializeComponents() {
    if (!global.Sidebar || typeof global.Sidebar.load !== "function") {
      throw new Error("Sidebar module is not available.");
    }

    if (!global.Navbar || typeof global.Navbar.load !== "function") {
      throw new Error("Navbar module is not available.");
    }

    await global.Sidebar.load();

    await global.Navbar.load();
  }

  async function initializePage() {
    if (!global.Page || typeof global.Page.initialize !== "function") {
      return;
    }

    await global.Page.initialize();
  }

  async function initialize() {
    if (state.initialized) {
      return;
    }

    try {
      await initializeAuthentication();

      await initializeComponents();

      await initializePage();

      state.initialized = true;
    } catch (error) {
      console.error("Application initialization failed.", error);

      throw error;
    }
  }

  async function destroy() {
    if (global.Page && typeof global.Page.destroy === "function") {
      await global.Page.destroy();
    }

    if (global.Navbar && typeof global.Navbar.destroy === "function") {
      global.Navbar.destroy();
    }

    if (global.Sidebar && typeof global.Sidebar.destroy === "function") {
      global.Sidebar.destroy();
    }

    state.initialized = false;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initialize().catch((error) => {
      console.error(error);
    });
  });

  global.App = Object.freeze({
    initialize,
    destroy,
  });
})(window);

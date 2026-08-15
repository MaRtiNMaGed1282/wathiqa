"use strict";

(function (global) {
  const TOASTIFY_CSS = "../assets/vendor/toastify/toastify.css";
  const TOASTIFY_JS = "../assets/vendor/toastify/toastify.js";

  function loadStylesheet() {
    if (document.querySelector(`link[href="${TOASTIFY_CSS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = TOASTIFY_CSS;
    document.head.appendChild(link);
  }

  function loadToastify() {
    loadStylesheet();
    if (typeof global.Toastify === "function") return Promise.resolve();

    const existing = document.querySelector(`script[src="${TOASTIFY_JS}"]`);
    if (existing) {
      return new Promise((resolve) => {
        if (typeof global.Toastify === "function") return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", resolve, { once: true });
      });
    }

    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = TOASTIFY_JS;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  function injectStyles() {
    if (document.getElementById("wathiqa-ui-style")) return;
    const style = document.createElement("style");
    style.id = "wathiqa-ui-style";
    style.textContent = `
      .wathiqa-confirm-toast {
        width: min(420px, calc(100vw - 32px));
        padding: 0 !important;
        background: #fff !important;
        color: #1f2937 !important;
        border: 1px solid #e5e7eb;
        border-radius: 12px !important;
        box-shadow: 0 12px 35px rgba(15, 23, 42, .18) !important;
        overflow: hidden;
      }
      .wathiqa-confirm-content {
        padding: 18px 20px 14px;
        direction: rtl;
        text-align: right;
        font-family: Cairo, sans-serif;
      }
      .wathiqa-confirm-message {
        font-size: 14px;
        line-height: 1.8;
        margin-bottom: 14px;
      }
      .wathiqa-confirm-actions {
        display: flex;
        justify-content: flex-start;
        gap: 8px;
      }
      .wathiqa-confirm-actions button {
        border: 1px solid #d1d5db;
        border-radius: 7px;
        padding: 7px 18px;
        font-family: Cairo, sans-serif;
        font-size: 13px;
        cursor: pointer;
      }
      .wathiqa-confirm-ok {
        background: #1d4ed8;
        color: #fff;
        border-color: #1d4ed8 !important;
      }
      .wathiqa-confirm-cancel {
        background: #fff;
        color: #374151;
      }
    `;
    document.head.appendChild(style);
  }

  async function toast(message, success = true) {
    await loadToastify();
    if (typeof global.Toastify !== "function") {
      console.error(message);
      return;
    }
    return global.Toastify({
      text: String(message ?? ""),
      duration: 3000,
      gravity: "top",
      position: "left",
      close: true,
      style: {
        background: success ? "#16a34a" : "#dc2626",
        fontFamily: "Cairo, sans-serif",
      },
    }).showToast();
  }

  async function confirm(message) {
    await loadToastify();
    injectStyles();

    if (typeof global.Toastify !== "function") return global.confirm(message);

    return new Promise((resolve) => {
      const content = document.createElement("div");
      content.className = "wathiqa-confirm-content";
      content.innerHTML = `
        <div class="wathiqa-confirm-message"></div>
        <div class="wathiqa-confirm-actions">
          <button type="button" class="wathiqa-confirm-ok">تأكيد</button>
          <button type="button" class="wathiqa-confirm-cancel">إلغاء</button>
        </div>
      `;
      content.querySelector(".wathiqa-confirm-message").textContent = String(message ?? "");

      const toastInstance = global.Toastify({
        node: content,
        duration: -1,
        gravity: "top",
        position: "center",
        close: false,
        className: "wathiqa-confirm-toast",
      });

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        toastInstance.hideToast();
        resolve(value);
      };

      content.querySelector(".wathiqa-confirm-ok").addEventListener("click", () => finish(true));
      content.querySelector(".wathiqa-confirm-cancel").addEventListener("click", () => finish(false));
      toastInstance.showToast();
    });
  }

  global.WathiqaUI = Object.freeze({ toast, confirm });
  loadToastify();
})(window);

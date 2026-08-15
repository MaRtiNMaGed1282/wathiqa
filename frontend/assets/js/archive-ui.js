"use strict";

(function (global) {
  const ENTITY_LABELS = Object.freeze({
    client: "الموكل",
    case: "القضية",
    service: "الخدمة",
  });

  const LIST_ROUTES = Object.freeze({
    client: "clients.html",
    case: "cases.html",
    service: "services.html",
  });

  const state = { observer: null };

  function getPageContext() {
    const page = (global.location.pathname.split("/").pop() || "").toLowerCase();
    const params = new URLSearchParams(global.location.search);
    const id =
      params.get("id") ||
      params.get("record_id") ||
      params.get("case_id") ||
      params.get("service_id");

    if (!id || !/^\d+$/.test(id)) return null;

    if (page === "client-profile.html") {
      return { type: "client", id: Number(id) };
    }

    if (page === "case-profile.html") {
      return { type: "case", id: Number(id) };
    }

    if (page === "service-profile.html") {
      return { type: "service", id: Number(id) };
    }

    return null;
  }

  function isAdmin() {
    try {
      return (
        String(global.auth?.getUser?.()?.role || "").toLowerCase() === "admin"
      );
    } catch (_) {
      return false;
    }
  }

  function toast(message, success = true) {
    if (typeof global.Toastify === "function") {
      global.Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "left",
        close: true,
        stopOnFocus: true,
        style: {
          background: success ? "#16a34a" : "#dc2626",
        },
      }).showToast();
    } else {
      global.alert(message);
    }
  }

  async function confirmArchive(label) {
    const text = `سيتم نقل ${label} إلى الأرشيف ولن يظهر ضمن السجلات النشطة.`;

    if (global.Swal?.fire) {
      const result = await global.Swal.fire({
        title: "تأكيد الأرشفة",
        text,
        input: "textarea",
        inputLabel: "سبب الأرشفة (اختياري)",
        inputPlaceholder: "اكتب سبب الأرشفة...",
        showCancelButton: true,
        confirmButtonText: "أرشفة",
        cancelButtonText: "إلغاء",
        confirmButtonColor: "#b45309",
        reverseButtons: true,
      });

      return result.isConfirmed ? String(result.value || "").trim() : null;
    }

    return global.confirm(text) ? "" : null;
  }

  async function archiveRecord(type, id, label) {
    const reason = await confirmArchive(label);
    if (reason === null) return;

    try {
      const result = await global.api.post("/archive", {
        entityType: type,
        recordId: id,
        reason: reason || null,
      });

      toast(result?.message || "تمت الأرشفة بنجاح", true);

      setTimeout(() => {
        global.location.href = LIST_ROUTES[type];
      }, 450);
    } catch (error) {
      console.error("Archive failed:", error);
      toast(error?.message || "فشل تنفيذ الأرشفة", false);
    }
  }

  function styleArchiveButton(button) {
    button.className =
      "wathiqa-archive-action inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition";

    Object.assign(button.style, {
      backgroundColor: "#b45309",
      color: "#ffffff",
      border: "1px solid #92400e",
      boxShadow: "0 4px 12px rgba(180, 83, 9, 0.18)",
      fontWeight: "700",
      whiteSpace: "nowrap",
      cursor: "pointer",
    });

    button.onmouseenter = () => {
      button.style.backgroundColor = "#92400e";
    };

    button.onmouseleave = () => {
      button.style.backgroundColor = "#b45309";
    };
  }

  function placeProfileActions() {
    const context = getPageContext();
    if (!context) return;

    const heading = document.querySelector("h1");
    const header = heading?.parentElement;
    if (!header?.classList.contains("flex")) return;

    const archiveButton = document.getElementById("archive-record-button");
    const invoiceButton = document.getElementById("create-invoice-button");

    if (!archiveButton) return;

    let actionGroup = document.getElementById("wathiqa-profile-actions");

    if (!actionGroup) {
      actionGroup = document.createElement("div");
      actionGroup.id = "wathiqa-profile-actions";
      actionGroup.className = "flex items-center gap-3";
      actionGroup.style.flexShrink = "0";
      header.appendChild(actionGroup);
    }

    if (invoiceButton && invoiceButton.parentElement !== actionGroup) {
      actionGroup.appendChild(invoiceButton);
    }

    if (archiveButton.parentElement !== actionGroup) {
      actionGroup.appendChild(archiveButton);
    }
  }

  function addProfileArchiveButton() {
    if (!isAdmin()) return;

    const context = getPageContext();
    if (!context || document.getElementById("archive-record-button")) {
      placeProfileActions();
      return;
    }

    const button = document.createElement("button");
    button.id = "archive-record-button";
    button.type = "button";
    button.textContent = `أرشفة ${ENTITY_LABELS[context.type]}`;
    button.setAttribute("aria-label", `أرشفة ${ENTITY_LABELS[context.type]}`);

    styleArchiveButton(button);

    button.addEventListener("click", () =>
      archiveRecord(context.type, context.id, ENTITY_LABELS[context.type]),
    );

    const heading = document.querySelector("h1");
    const header = heading?.parentElement;

    if (header?.classList.contains("flex")) {
      header.appendChild(button);
      placeProfileActions();
    } else {
      button.style.position = "fixed";
      button.style.top = "18px";
      button.style.left = "18px";
      button.style.zIndex = "9999";
      document.body.appendChild(button);
    }
  }

  function addArchiveLinkToSidebar() {
    if (!isAdmin()) return;

    const sidebar = document.getElementById("sidebar");
    if (!sidebar || sidebar.querySelector('[data-page="archive"]')) return;

    const nav = sidebar.querySelector("nav") || sidebar.querySelector(".sidebar-nav");
    if (!nav) return;

    const link = document.createElement("a");
    link.href = "archive.html";
    link.dataset.page = "archive";
    link.className =
      "sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg transition";
    link.innerHTML = '<i data-lucide="archive"></i><span>الأرشيف</span>';

    nav.appendChild(link);

    if (global.lucide?.createIcons) {
      global.lucide.createIcons();
    }
  }

  function injectInvoiceUiStyles() {
    if (document.getElementById("wathiqa-invoice-ui-styles")) return;

    const style = document.createElement("style");
    style.id = "wathiqa-invoice-ui-styles";
    style.textContent = `
      #wathiqa-invoice-modal {
        background: rgba(15, 23, 42, 0.62) !important;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        padding: 24px !important;
      }

      #wathiqa-invoice-modal > div {
        width: min(960px, calc(100vw - 32px)) !important;
        max-width: 960px !important;
        max-height: min(900px, calc(100vh - 48px)) !important;
        border: 1px solid #e5e7eb;
        border-radius: 24px !important;
        overflow: hidden !important;
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28) !important;
      }

      #wathiqa-invoice-modal > div > div:first-child {
        padding: 20px 24px !important;
        background: #ffffff !important;
        border-bottom: 1px solid #e5e7eb !important;
      }

      #wathiqa-invoice-modal > div > div:first-child h2 {
        color: #1f2a44;
        font-size: 24px !important;
        line-height: 1.4;
      }

      #wathiqa-invoice-modal > div > div:first-child p {
        color: #64748b !important;
      }

      #wathiqa-invoice-modal [data-invoice-close] {
        background: #f8fafc;
        color: #475569;
        border: 1px solid #e2e8f0;
        transition: 0.2s ease;
      }

      #wathiqa-invoice-modal [data-invoice-close]:hover {
        background: #fee2e2;
        color: #b91c1c;
        border-color: #fecaca;
      }

      #wathiqa-invoice-modal > div > div:nth-child(2) {
        padding: 22px 24px 28px !important;
        background: #ffffff;
      }

      #wathiqa-invoice-modal .invoice-tab {
        min-height: 44px;
        padding: 10px 18px !important;
        border-radius: 10px !important;
        font-weight: 700;
        transition: 0.2s ease;
      }

      #wathiqa-invoice-modal .invoice-tab:not(.bg-primary):hover {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
      }

      #wathiqa-invoice-modal label {
        color: #334155;
        font-size: 14px;
        font-weight: 700;
      }

      #wathiqa-invoice-modal input,
      #wathiqa-invoice-modal select,
      #wathiqa-invoice-modal textarea {
        min-height: 50px;
        border-color: #dbe2ea !important;
        border-radius: 10px !important;
        background: #ffffff !important;
        color: #1f2937;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      #wathiqa-invoice-modal input:focus,
      #wathiqa-invoice-modal select:focus,
      #wathiqa-invoice-modal textarea:focus {
        outline: none;
        border-color: #1f2a44 !important;
        box-shadow: 0 0 0 3px rgba(31, 42, 68, 0.10) !important;
      }

      #wathiqa-invoice-modal #invoiceItems {
        background: #f8fafc;
        padding: 14px !important;
      }

      #wathiqa-invoice-modal #invoiceItems > .invoice-item {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 120px 160px 42px !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 10px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }

      #wathiqa-invoice-modal #invoiceItems > .invoice-item button[data-remove-item] {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #fef2f2;
        color: #dc2626 !important;
        border: 1px solid #fecaca;
      }

      #wathiqa-invoice-modal [data-invoice-add-item] {
        min-height: 42px;
        border-radius: 10px !important;
        font-weight: 700;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
      }

      #wathiqa-invoice-modal [id^="invoiceSubtotal"],
      #wathiqa-invoice-modal [id^="invoiceDiscountTotal"],
      #wathiqa-invoice-modal #invoiceTotal {
        font-variant-numeric: tabular-nums;
      }

      #wathiqa-invoice-modal #invoiceSubtotal,
      #wathiqa-invoice-modal #invoiceDiscountTotal {
        color: #1f2a44;
      }

      #wathiqa-invoice-modal #invoiceTotal {
        font-size: 24px !important;
      }

      #wathiqa-invoice-modal #invoiceCreateForm > div:last-child button {
        min-height: 48px;
        border-radius: 11px !important;
        font-weight: 700;
        padding-inline: 24px !important;
      }

      #wathiqa-invoice-modal [data-invoice-panel="list"] > div:first-child {
        padding: 4px;
      }

      #wathiqa-invoice-modal #invoiceList article {
        border-color: #e2e8f0 !important;
        background: #ffffff;
        transition: 0.2s ease;
      }

      #wathiqa-invoice-modal #invoiceList article:hover {
        border-color: #cbd5e1 !important;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      }

      @media (max-width: 720px) {
        #wathiqa-invoice-modal {
          padding: 10px !important;
        }

        #wathiqa-invoice-modal > div {
          width: calc(100vw - 20px) !important;
          max-height: calc(100vh - 20px) !important;
          border-radius: 18px !important;
        }

        #wathiqa-invoice-modal #invoiceItems > .invoice-item {
          grid-template-columns: 1fr !important;
        }

        #wathiqa-invoice-modal #invoiceItems > .invoice-item button[data-remove-item] {
          width: 100%;
        }
      }

      #wathiqa-profile-actions {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        flex-shrink: 0 !important;
      }

      #archive-record-button {
        background: #b45309 !important;
        color: #ffffff !important;
        border: 1px solid #92400e !important;
      }

      #archive-record-button:hover {
        background: #92400e !important;
      }

      @media (max-width: 700px) {
        #wathiqa-profile-actions {
          flex-wrap: wrap;
          justify-content: flex-start;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function initialize() {
    injectInvoiceUiStyles();
    addArchiveLinkToSidebar();
    addProfileArchiveButton();
    placeProfileActions();
  }

  function observeShell() {
    if (state.observer || !document.body) return;

    state.observer = new MutationObserver(() => {
      addArchiveLinkToSidebar();
      addProfileArchiveButton();
      placeProfileActions();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initialize();
        observeShell();
      },
      { once: true },
    );
  } else {
    initialize();
    observeShell();
  }

  global.WathiqaArchiveUI = Object.freeze({
    archiveRecord,
    initialize,
  });

  if (!document.querySelector('script[data-wathiqa-invoice-ui="true"]')) {
    const script = document.createElement("script");
    script.src = "../assets/js/invoice-ui.js";
    script.dataset.wathiqaInvoiceUi = "true";
    script.async = false;
    document.head.appendChild(script);
  }
})(window);

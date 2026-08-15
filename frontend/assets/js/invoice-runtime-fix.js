"use strict";

(function (global) {
  function applyInvoiceListLayout() {
    const modal = global.document.querySelector("#wathiqa-invoice-modal");
    if (!modal) return;

    const search = modal.querySelector("#invoiceSearch");
    const status = modal.querySelector("#invoiceStatus");
    const refresh = modal.querySelector("[data-invoice-refresh]");

    if (!search || !status || !refresh) return;

    const row = search.parentElement;
    if (!row) return;

    row.style.display = "grid";
    row.style.gridTemplateColumns = "minmax(0, 1fr) 220px auto";
    row.style.alignItems = "stretch";
    row.style.width = "100%";
    row.style.gap = "12px";

    search.style.display = "block";
    search.style.width = "100%";
    search.style.minWidth = "0";
    search.style.boxSizing = "border-box";
    search.style.flex = "none";

    status.style.width = "100%";
    status.style.minWidth = "0";
    status.style.boxSizing = "border-box";

    refresh.style.minWidth = "70px";
    refresh.style.minHeight = "48px";
    refresh.style.whiteSpace = "nowrap";

    const media = global.document.getElementById("wathiqa-invoice-runtime-style");
    if (!media) {
      const style = global.document.createElement("style");
      style.id = "wathiqa-invoice-runtime-style";
      style.textContent = `
        #wathiqa-invoice-modal #invoiceSearch::placeholder { opacity: 1; }
        @media (max-width: 700px) {
          #wathiqa-invoice-modal #invoiceSearch,
          #wathiqa-invoice-modal #invoiceStatus,
          #wathiqa-invoice-modal [data-invoice-refresh] { width: 100%; }
          #wathiqa-invoice-modal #invoiceSearch + #invoiceStatus { width: 100%; }
          #wathiqa-invoice-modal #invoiceSearch { grid-column: 1 / -1; }
          #wathiqa-invoice-modal #invoiceStatus { grid-column: 1 / -1; }
          #wathiqa-invoice-modal [data-invoice-refresh] { grid-column: 1 / -1; }
        }
      `;
      global.document.head.appendChild(style);
    }
  }

  const observer = new MutationObserver(applyInvoiceListLayout);

  function start() {
    applyInvoiceListLayout();
    if (global.document.body) observer.observe(global.document.body, { childList: true, subtree: true });
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})(window);

"use strict";

(function (global) {
  function apply() {
    const modal = document.querySelector("#wathiqa-invoice-modal");
    if (!modal) return;

    const panel = modal.firstElementChild;
    if (!panel) return;

    panel.style.height = "calc(100vh - 32px)";
    panel.style.maxHeight = "calc(100vh - 32px)";
    panel.style.overflow = "hidden";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";

    const header = panel.firstElementChild;
    const body = panel.children[1];

    if (header) {
      header.style.flex = "0 0 auto";
    }

    if (body) {
      body.style.flex = "1 1 auto";
      body.style.minHeight = "0";
      body.style.overflowY = "auto";
      body.style.overflowX = "hidden";
      body.style.scrollBehavior = "smooth";
    }

    const form = modal.querySelector("#invoiceCreateForm");
    const submitButton = form?.querySelector('button[type="submit"], #invoice-submit-button');
    const submitWrapper = submitButton?.parentElement;

    if (submitWrapper) {
      submitWrapper.style.position = "sticky";
      submitWrapper.style.bottom = "-20px";
      submitWrapper.style.zIndex = "30";
      submitWrapper.style.background = "white";
      submitWrapper.style.padding = "12px 0 20px";
      submitWrapper.style.marginTop = "8px";
      submitWrapper.style.borderTop = "1px solid #e5e7eb";
    }

    if (submitButton) {
      submitButton.style.display = "inline-flex";
      submitButton.style.alignItems = "center";
      submitButton.style.justifyContent = "center";
      submitButton.style.minHeight = "48px";
      submitButton.style.minWidth = "180px";
      submitButton.style.cursor = "pointer";
      submitButton.style.position = "relative";
      submitButton.style.zIndex = "31";
    }
  }

  const observer = new MutationObserver(apply);

  function start() {
    apply();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);

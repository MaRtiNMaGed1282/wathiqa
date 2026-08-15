"use strict";

(function (global) {
  const SELECTOR = "#wathiqa-invoice-modal";

  function toast(message, success = false) {
    if (typeof global.Toastify === "function") {
      global.Toastify({ text: message, duration: 3000, gravity: "top", position: "left", close: true, style: { background: success ? "#15803d" : "#b42318" } }).showToast();
    } else if (message) global.alert(message);
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه`;
  }

  function recalculate(modal) {
    let subtotal = 0;
    modal.querySelectorAll(".invoice-item").forEach((row) => {
      subtotal += Number(row.querySelector('[data-field="quantity"]')?.value || 0) * Number(row.querySelector('[data-field="unit_price"]')?.value || 0);
    });
    const discount = Math.min(Math.max(0, Number(modal.querySelector("#invoiceDiscount")?.value || 0)), subtotal);
    modal.querySelector("#invoiceSubtotal").textContent = money(subtotal);
    modal.querySelector("#invoiceDiscountTotal").textContent = money(discount);
    modal.querySelector("#invoiceTotal").textContent = money(subtotal - discount);
  }

  function normalizeQuantities(modal) {
    modal.querySelectorAll('[data-field="quantity"]').forEach((input) => {
      if (input.dataset.quantityFixInstalled === "true") return;
      input.dataset.quantityFixInstalled = "true";
      input.min = "1";
      input.step = "1";
      input.value = String(Math.max(1, Math.round(Number(input.value) || 1)));
      const normalize = () => {
        input.value = String(Math.max(1, Math.round(Number(input.value) || 1)));
        recalculate(modal);
      };
      input.addEventListener("input", normalize);
      input.addEventListener("change", normalize);
    });
  }

  function install(modal) {
    if (!modal || modal.dataset.invoiceFixesInstalled === "true") return;
    modal.dataset.invoiceFixesInstalled = "true";

    const form = modal.querySelector("#invoiceCreateForm");
    const submitButton = form?.querySelector('button[type="submit"]');
    if (!form || !submitButton) return;

    form.noValidate = true;
    modal.querySelector("#invoiceDiscount")?.addEventListener("input", () => recalculate(modal));
    modal.querySelector("#invoiceDiscount")?.addEventListener("change", () => recalculate(modal));
    modal.addEventListener("input", (event) => {
      if (event.target.matches('[data-field="unit_price"]')) recalculate(modal);
    });

    normalizeQuantities(modal);
    recalculate(modal);

    submitButton.type = "button";
    submitButton.id = "invoice-submit-button";
    submitButton.style.pointerEvents = "auto";
    submitButton.style.position = "relative";
    submitButton.style.zIndex = "20";
    submitButton.disabled = false;

    submitButton.addEventListener("click", () => {
      const client = modal.querySelector("#invoiceClient")?.value;
      const issueDate = modal.querySelector("#invoiceIssueDate")?.value;
      const items = [...modal.querySelectorAll(".invoice-item")];

      if (!client) return toast("اختر الموكل أولاً");
      if (!issueDate) return toast("تاريخ الإصدار مطلوب");
      if (!items.length) return toast("أضف بنداً واحداً على الأقل");

      for (const row of items) {
        const description = row.querySelector('[data-field="description"]')?.value.trim();
        const quantity = Number(row.querySelector('[data-field="quantity"]')?.value);
        const price = Number(row.querySelector('[data-field="unit_price"]')?.value);
        if (!description) return toast("وصف البند مطلوب");
        if (!Number.isInteger(quantity) || quantity < 1) return toast("الكمية يجب أن تكون رقماً صحيحاً يبدأ من 1");
        if (!Number.isFinite(price) || price < 0) return toast("سعر الوحدة غير صحيح");
      }

      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const childObserver = new MutationObserver(() => {
      normalizeQuantities(modal);
      recalculate(modal);
    });
    childObserver.observe(modal.querySelector("#invoiceItems") || modal, { childList: true, subtree: true });
  }

  function scan() {
    const modal = document.querySelector(SELECTOR);
    if (modal) install(modal);
  }

  const observer = new MutationObserver(scan);
  const start = () => {
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);

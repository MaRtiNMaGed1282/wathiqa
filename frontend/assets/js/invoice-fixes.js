"use strict";

(function (global) {
  const SELECTOR = "#wathiqa-invoice-modal";

  function toast(message, success = false) {
    if (typeof global.Toastify === "function") {
      global.Toastify({ text: message, duration: 3000, gravity: "top", position: "left", close: true, style: { background: success ? "#15803d" : "#b42318" } }).showToast();
    } else if (message) {
      global.alert(message);
    }
  }

  function recalculate(modal) {
    let subtotal = 0;
    modal.querySelectorAll(".invoice-item").forEach((row) => {
      const quantity = Number(row.querySelector('[data-field="quantity"]')?.value || 0);
      const price = Number(row.querySelector('[data-field="unit_price"]')?.value || 0);
      subtotal += quantity * price;
    });

    const discountInput = modal.querySelector("#invoiceDiscount");
    const discount = Math.min(Math.max(0, Number(discountInput?.value || 0)), subtotal);
    const total = subtotal - discount;

    const money = (value) => `${Number(value || 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه`;
    modal.querySelector("#invoiceSubtotal").textContent = money(subtotal);
    modal.querySelector("#invoiceDiscountTotal").textContent = money(discount);
    modal.querySelector("#invoiceTotal").textContent = money(total);
  }

  function normalizeQuantities(modal) {
    modal.querySelectorAll('[data-field="quantity"]').forEach((input) => {
      input.min = "1";
      input.step = "1";
      input.value = String(Math.max(1, Math.round(Number(input.value) || 1)));
      input.addEventListener("input", () => {
        const value = Math.max(1, Math.round(Number(input.value) || 1));
        if (String(value) !== input.value) input.value = String(value);
        recalculate(modal);
      });
      input.addEventListener("change", () => {
        input.value = String(Math.max(1, Math.round(Number(input.value) || 1)));
        recalculate(modal);
      });
    });
  }

  function install(modal) {
    if (!modal || modal.dataset.invoiceFixesInstalled === "true") return;
    modal.dataset.invoiceFixesInstalled = "true";

    const form = modal.querySelector("#invoiceCreateForm");
    const submitButton = form?.querySelector('button[type="submit"]');
    const discount = modal.querySelector("#invoiceDiscount");

    if (!form || !submitButton) return;

    form.noValidate = true;

    discount?.addEventListener("input", () => recalculate(modal));
    discount?.addEventListener("change", () => recalculate(modal));

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

      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });
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

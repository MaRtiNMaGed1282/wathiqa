(function (global) {
  "use strict";

  function isCaseProfile() {
    return /(^|\/)case-profile\.html$/i.test(global.location.pathname);
  }

  function isClientProfile() {
    return /(^|\/)client-profile\.html$/i.test(global.location.pathname);
  }

  function isChangePassword() {
    return /(^|\/)change-password\.html$/i.test(global.location.pathname);
  }

  function getUserRole() {
    try {
      return global.auth?.getUser?.()?.role || null;
    } catch {
      return null;
    }
  }

  function hideSectionByHeading(headingText) {
    const headings = Array.from(document.querySelectorAll("h2, h3"));
    const heading = headings.find((node) => node.textContent.trim() === headingText);
    if (!heading) return;
    const section = heading.closest(".bg-white.rounded-xl.shadow") || heading.parentElement;
    if (section) {
      section.hidden = true;
      section.setAttribute("aria-hidden", "true");
    }
  }

  function hideFinancialSectionByHeading(headingText) {
    const headings = Array.from(document.querySelectorAll("h3"));
    const heading = headings.find((node) => node.textContent.trim() === headingText);
    if (!heading) return;
    const section = heading.closest(".bg-white.shadow.rounded.p-6");
    if (section) {
      section.hidden = true;
      section.setAttribute("aria-hidden", "true");
    }
  }

  function hideCaseFinancialControls() {
    hideFinancialSectionByHeading("البيانات المالية");
    hideFinancialSectionByHeading("الدفعات");
    hideFinancialSectionByHeading("المصروفات");

    ["paymentModal", "expenseModal"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.hidden = true;
        element.classList.add("hidden");
        element.setAttribute("aria-hidden", "true");
      }
    });

    const feesInput = document.getElementById("edit_total_fees");
    if (feesInput) {
      const wrapper = feesInput.closest("div");
      if (wrapper) wrapper.hidden = true;
    }

    document
      .querySelectorAll('[onclick="openPaymentModal()"], [onclick="openExpenseModal()"]')
      .forEach((element) => {
        element.hidden = true;
        element.setAttribute("aria-hidden", "true");
      });
  }

  function hideClientFinancialControls() {
    hideSectionByHeading("الملخص المالي");
  }

  function applyCaseValidation() {
    const requiredFields = [
      "edit_case_title",
      "edit_court_case_number",
      "edit_case_type",
      "edit_court_name",
      "edit_court_chamber",
      "edit_opened_at",
      "hearing_date",
      "payment_amount",
      "payment_date",
      "expense_type",
      "expense_amount",
      "expense_date",
    ];

    requiredFields.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.required = true;
    });

    ["edit_total_fees", "payment_amount", "expense_amount"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.type = "number";
        element.min = "0";
        element.step = "0.01";
        element.inputMode = "decimal";
      }
    });
  }

  function applyClientValidation() {
    ["attorney_number", "attorney_type", "issue_date", "issuing_office"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.required = true;
    });

    const file = document.getElementById("attorney_file");
    if (file) file.accept = ".pdf,.jpg,.jpeg,.png,.webp";
  }

  function applyPasswordValidation() {
    ["newPassword", "confirmPassword"].forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.required = true;
      element.minLength = 8;
      element.autocomplete = "new-password";
    });
  }

  function ensurePageErrorBanner() {
    let banner = document.getElementById("phase25-page-error");
    if (banner) return banner;

    banner = document.createElement("div");
    banner.id = "phase25-page-error";
    banner.className = "hidden mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700";
    banner.setAttribute("role", "alert");
    banner.innerHTML = `
      <div class="font-semibold">تعذر تحميل البيانات</div>
      <div id="phase25-page-error-message" class="text-sm mt-1"></div>
      <button id="phase25-page-error-retry" type="button" class="mt-3 bg-red-600 text-white px-4 py-2 rounded">إعادة المحاولة</button>
    `;

    const main = document.querySelector("main") || document.body;
    main.prepend(banner);
    return banner;
  }

  function showPageError(message) {
    const banner = ensurePageErrorBanner();
    const messageElement = document.getElementById("phase25-page-error-message");
    const retry = document.getElementById("phase25-page-error-retry");

    if (messageElement) messageElement.textContent = message || "حدث خطأ أثناء تحميل البيانات";
    banner.classList.remove("hidden");

    if (retry && !retry.dataset.bound) {
      retry.dataset.bound = "true";
      retry.addEventListener("click", () => global.location.reload());
    }
  }

  function hidePageError() {
    const banner = document.getElementById("phase25-page-error");
    if (banner) banner.classList.add("hidden");
  }

  function init() {
    const caseProfile = isCaseProfile();
    const clientProfile = isClientProfile();

    if (caseProfile) {
      applyCaseValidation();
      if (getUserRole() === "assistant") hideCaseFinancialControls();
    }

    if (clientProfile) {
      applyClientValidation();
      if (getUserRole() === "assistant") hideClientFinancialControls();
    }

    if (isChangePassword()) applyPasswordValidation();

    if (!caseProfile && !clientProfile) return;

    const lastError = global.__WATHIQA_LAST_API_ERROR__;
    if (lastError?.method === "GET") showPageError(lastError.message);

    global.addEventListener("wathiqa:api-error", (event) => {
      if (event.detail?.method === "GET") showPageError(event.detail.message);
    });

    global.addEventListener("wathiqa:api-success", (event) => {
      if (event.detail?.method === "GET") hidePageError();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);

(function (global) {
  "use strict";

  function isPage(name) { return new RegExp(`(^|\\/)${name}\\.html$`, "i").test(global.location.pathname); }
  const isCaseProfile = () => isPage("case-profile");
  const isClientProfile = () => isPage("client-profile");
  const isChangePassword = () => isPage("change-password");
  const isDashboard = () => isPage("dashboard");
  const isServiceProfile = () => isPage("service-profile");
  const isServices = () => isPage("services");
  const isCalendar = () => isPage("calendar");
  const isNotifications = () => isPage("notifications");

  function getUserRole() { try { return global.auth?.getUser?.()?.role || null; } catch { return null; } }
  function hideElement(id) { const element = document.getElementById(id); if (element) { element.hidden = true; element.setAttribute("aria-hidden", "true"); } }

  function hideSectionByHeading(headingText) {
    const heading = Array.from(document.querySelectorAll("h2, h3")).find((node) => node.textContent.trim() === headingText);
    if (!heading) return;
    const section = heading.closest(".bg-white.rounded-xl.shadow") || heading.parentElement;
    if (section) { section.hidden = true; section.setAttribute("aria-hidden", "true"); }
  }

  function hideFinancialSectionByHeading(headingText) {
    const heading = Array.from(document.querySelectorAll("h3")).find((node) => node.textContent.trim() === headingText);
    if (!heading) return;
    const section = heading.closest(".bg-white.shadow.rounded.p-6");
    if (section) { section.hidden = true; section.setAttribute("aria-hidden", "true"); }
  }

  function hideCaseFinancialControls() {
    hideFinancialSectionByHeading("البيانات المالية");
    hideFinancialSectionByHeading("الدفعات");
    hideFinancialSectionByHeading("المصروفات");
    ["paymentModal", "expenseModal"].forEach(hideElement);
    const feesInput = document.getElementById("edit_total_fees");
    if (feesInput) { const wrapper = feesInput.closest("div"); if (wrapper) wrapper.hidden = true; }
    document.querySelectorAll('[onclick="openPaymentModal()"], [onclick="openExpenseModal()"]')
      .forEach((element) => { element.hidden = true; element.setAttribute("aria-hidden", "true"); });
  }

  function hideClientFinancialControls() { hideSectionByHeading("الملخص المالي"); }
  function hideDashboardFinancialControls() { ["kpi-revenue", "kpi-outstanding", "dashboard-financial-chart", "action-payment"].forEach(hideElement); }

  function applyCaseValidation() {
    ["edit_case_title", "edit_court_case_number", "edit_case_type", "edit_court_name", "edit_court_chamber", "edit_opened_at", "hearing_date", "payment_amount", "payment_date", "expense_type", "expense_amount", "expense_date"].forEach((id) => { const element = document.getElementById(id); if (element) element.required = true; });
    ["edit_total_fees", "payment_amount", "expense_amount"].forEach((id) => { const element = document.getElementById(id); if (!element) return; element.type = "number"; element.min = "0"; element.step = "0.01"; element.inputMode = "decimal"; });
  }

  function applyClientValidation() {
    ["attorney_number", "attorney_type", "issue_date", "issuing_office"].forEach((id) => { const element = document.getElementById(id); if (element) element.required = true; });
    const file = document.getElementById("attorney_file");
    if (file) file.accept = ".pdf,.jpg,.jpeg,.png,.webp";
  }

  function applyPasswordValidation() {
    ["newPassword", "confirmPassword"].forEach((id) => { const element = document.getElementById(id); if (!element) return; element.required = true; element.minLength = 8; element.autocomplete = "new-password"; });
  }

  function applyServiceValidation() {
    const file = document.getElementById("serviceFileInput");
    if (file) file.accept = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";
  }

  function applyServicesValidation() {
    ["clientSearch", "service_title", "service_type", "assigned_to", "start_date", "due_date", "total_fees", "description"].forEach((id) => { const element = document.getElementById(id); if (element) element.required = true; });
    const fees = document.getElementById("total_fees");
    if (fees) { fees.type = "number"; fees.min = "0"; fees.step = "0.01"; fees.inputMode = "decimal"; }
  }

  function applyCalendarValidation() {
    ["calendarCaseId", "calendarHearingDate", "calendarHearingTime", "calendarHearingType"].forEach((id) => { const element = document.getElementById(id); if (element) element.required = true; });
    const date = document.getElementById("calendarHearingDate"); if (date) date.type = "date";
    const time = document.getElementById("calendarHearingTime"); if (time) time.type = "time";
  }

  function applyNotificationsLoadingState() {
    const container = document.getElementById("notificationsListContainer");
    if (container && !container.textContent.trim()) {
      container.innerHTML = '<p class="text-gray-500 text-center py-8">جاري تحميل الإشعارات...</p>';
    }
  }

  function ensurePageErrorBanner() {
    let banner = document.getElementById("phase25-page-error");
    if (banner) return banner;
    banner = document.createElement("div");
    banner.id = "phase25-page-error";
    banner.className = "hidden mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700";
    banner.setAttribute("role", "alert");
    banner.innerHTML = '<div class="font-semibold">تعذر تحميل البيانات</div><div id="phase25-page-error-message" class="text-sm mt-1"></div><button id="phase25-page-error-retry" type="button" class="mt-3 bg-red-600 text-white px-4 py-2 rounded">إعادة المحاولة</button>';
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
    if (retry && !retry.dataset.bound) { retry.dataset.bound = "true"; retry.addEventListener("click", () => global.location.reload()); }
  }

  function hidePageError() { const banner = document.getElementById("phase25-page-error"); if (banner) banner.classList.add("hidden"); }

  function init() {
    const statePages = [isCaseProfile(), isClientProfile(), isDashboard(), isServiceProfile(), isServices(), isCalendar(), isNotifications()];
    if (isCaseProfile()) { applyCaseValidation(); if (getUserRole() === "assistant") hideCaseFinancialControls(); }
    if (isClientProfile()) { applyClientValidation(); if (getUserRole() === "assistant") hideClientFinancialControls(); }
    if (isChangePassword()) applyPasswordValidation();
    if (isDashboard() && getUserRole() === "assistant") hideDashboardFinancialControls();
    if (isServiceProfile()) applyServiceValidation();
    if (isServices()) applyServicesValidation();
    if (isCalendar()) applyCalendarValidation();
    if (isNotifications()) applyNotificationsLoadingState();
    if (!statePages.some(Boolean)) return;

    const lastError = global.__WATHIQA_LAST_API_ERROR__;
    if (lastError?.method === "GET") showPageError(lastError.message);
    global.addEventListener("wathiqa:api-error", (event) => { if (event.detail?.method === "GET") showPageError(event.detail.message); });
    global.addEventListener("wathiqa:api-success", (event) => { if (event.detail?.method === "GET") hidePageError(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);

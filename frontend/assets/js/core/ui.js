(function (global) {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toast(message, type = "success") {
    if (global.Toastify) {
      global.Toastify({
        text: String(message || ""),
        duration: 3000,
        gravity: "top",
        position: "center",
      }).showToast();
      return;
    }

    if (global.Swal) {
      global.Swal.fire({
        toast: true,
        position: "top",
        icon: type,
        title: String(message || ""),
        showConfirmButton: false,
        timer: 2500,
      });
      return;
    }

    if (message) global.alert(message);
  }

  async function confirm(options = {}) {
    const {
      title = "تأكيد العملية",
      text = "هل أنت متأكد من تنفيذ هذه العملية؟",
      confirmText = "تأكيد",
      cancelText = "إلغاء",
      icon = "warning",
    } = options;

    if (global.Swal) {
      const result = await global.Swal.fire({
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        reverseButtons: true,
      });
      return Boolean(result.isConfirmed);
    }

    return global.confirm(text);
  }

  function setLoading(element, loading, loadingText = "جاري التحميل...") {
    if (!element) return;

    if (loading) {
      element.dataset.originalText = element.textContent;
      element.disabled = true;
      element.setAttribute("aria-busy", "true");
      element.textContent = loadingText;
    } else {
      element.disabled = false;
      element.removeAttribute("aria-busy");
      if (element.dataset.originalText !== undefined) {
        element.textContent = element.dataset.originalText;
        delete element.dataset.originalText;
      }
    }
  }

  function setState(element, state, message = "") {
    if (!element) return;

    element.dataset.uiState = state;
    element.hidden = false;

    if (message) {
      element.textContent = message;
    }
  }

  function show(element) {
    if (!element) return;
    element.hidden = false;
    element.classList.remove("hidden");
  }

  function hide(element) {
    if (!element) return;
    element.hidden = true;
    element.classList.add("hidden");
  }

  function setEmptyState(element, message = "لا توجد بيانات") {
    if (!element) return;
    element.textContent = message;
    show(element);
  }

  function setErrorState(element, message = "حدث خطأ أثناء تحميل البيانات") {
    if (!element) return;
    element.textContent = message;
    show(element);
  }

  function setLoadingState(element, message = "جاري التحميل...") {
    if (!element) return;
    element.textContent = message;
    show(element);
  }

  global.ui = Object.freeze({
    escapeHtml,
    toast,
    confirm,
    setLoading,
    setState,
    show,
    hide,
    setEmptyState,
    setErrorState,
    setLoadingState,
  });
})(window);

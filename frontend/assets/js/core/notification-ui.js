(function (global) {
  "use strict";

  function render(container, notifications = [], options = {}) {
    if (!container) return;

    const { emptyMessage = "لا توجد إشعارات" } = options;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-gray-500">${global.ui?.escapeHtml?.(emptyMessage) || emptyMessage}</div>`;
      return;
    }

    container.innerHTML = notifications
      .map((notification) => {
        const title = global.ui?.escapeHtml?.(notification.title || "إشعار") || "إشعار";
        const message = global.ui?.escapeHtml?.(notification.message || "") || "";
        const date = global.ui?.escapeHtml?.(notification.created_at || "") || "";
        const unread = Number(notification.is_read) !== 1;

        return `
          <article class="border-b p-4 ${unread ? "bg-blue-50" : "bg-white"}" data-notification-id="${Number(notification.id)}">
            <div class="font-semibold text-[#1f2a44]">${title}</div>
            ${message ? `<div class="text-sm text-gray-600 mt-1">${message}</div>` : ""}
            ${date ? `<div class="text-xs text-gray-400 mt-2">${date}</div>` : ""}
          </article>`;
      })
      .join("");
  }

  async function refreshBadge(element, endpoint = "/notifications/unread-count") {
    if (!element || !global.api) return;

    try {
      const result = await global.api.get(endpoint);
      const count = Number(result?.count || 0);
      element.textContent = String(count);
      element.hidden = count === 0;
      element.classList.toggle("d-none", count === 0);
      element.setAttribute("aria-label", `${count} إشعار غير مقروء`);
    } catch (error) {
      console.error("Unable to refresh notification badge.", error);
    }
  }

  global.notificationUI = Object.freeze({
    render,
    refreshBadge,
  });
})(window);

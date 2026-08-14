(function (global) {
  "use strict";

  function render(container, activities = [], options = {}) {
    if (!container) return;

    const { emptyMessage = "لا يوجد نشاط" } = options;

    if (!Array.isArray(activities) || activities.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-gray-500">${global.ui?.escapeHtml?.(emptyMessage) || emptyMessage}</div>`;
      return;
    }

    container.innerHTML = activities
      .map((item) => {
        const action = global.ui?.escapeHtml?.(item.action || item.type || "نشاط") || "نشاط";
        const description = global.ui?.escapeHtml?.(item.description || "") || "";
        const actor = global.ui?.escapeHtml?.(item.user_name || item.username || "") || "";
        const date = global.ui?.escapeHtml?.(item.created_at || "") || "";

        return `
          <article class="relative border-r-2 border-gray-200 pr-4 pb-5">
            <div class="font-semibold text-[#1f2a44]">${action}</div>
            ${description ? `<div class="text-sm text-gray-600 mt-1">${description}</div>` : ""}
            <div class="text-xs text-gray-400 mt-2">${actor}${actor && date ? " · " : ""}${date}</div>
          </article>`;
      })
      .join("");
  }

  global.activityTimeline = Object.freeze({ render });
})(window);

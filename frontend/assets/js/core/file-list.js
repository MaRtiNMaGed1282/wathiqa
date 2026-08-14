(function (global) {
  "use strict";

  function formatSize(bytes) {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) return "—";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  function render(container, files = [], options = {}) {
    if (!container) return;

    const {
      emptyMessage = "لا توجد مستندات",
      onOpen,
      onDownload,
      onDelete,
    } = options;

    if (!Array.isArray(files) || files.length === 0) {
      container.innerHTML = `<div class="p-6 text-center text-gray-500">${global.ui?.escapeHtml?.(emptyMessage) || emptyMessage}</div>`;
      return;
    }

    container.innerHTML = files
      .map((file) => {
        const id = Number(file.id);
        const name = global.ui?.escapeHtml?.(file.original_name || file.filename || "ملف") || "ملف";
        const type = global.ui?.escapeHtml?.(file.mime_type || file.type || "") || "";
        const size = formatSize(file.file_size ?? file.size);
        const date = global.ui?.escapeHtml?.(file.created_at || file.uploaded_at || "") || "";

        return `
          <div class="flex flex-wrap items-center justify-between gap-3 border-b p-4" data-file-id="${id}">
            <div class="min-w-0">
              <div class="font-semibold truncate">${name}</div>
              <div class="text-sm text-gray-500">${type} · ${size}${date ? ` · ${date}` : ""}</div>
            </div>
            <div class="flex flex-wrap gap-2">
              ${onOpen ? `<button type="button" data-file-action="open" data-file-id="${id}" class="px-3 py-1 rounded-lg border">فتح</button>` : ""}
              ${onDownload ? `<button type="button" data-file-action="download" data-file-id="${id}" class="px-3 py-1 rounded-lg border">تحميل</button>` : ""}
              ${onDelete ? `<button type="button" data-file-action="delete" data-file-id="${id}" class="px-3 py-1 rounded-lg bg-red-600 text-white">حذف</button>` : ""}
            </div>
          </div>`;
      })
      .join("");

    container.querySelectorAll("[data-file-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.dataset.fileId);
        const action = button.dataset.fileAction;
        if (action === "open" && onOpen) onOpen(id);
        if (action === "download" && onDownload) onDownload(id);
        if (action === "delete" && onDelete) onDelete(id);
      });
    });
  }

  global.fileList = Object.freeze({
    formatSize,
    render,
  });
})(window);

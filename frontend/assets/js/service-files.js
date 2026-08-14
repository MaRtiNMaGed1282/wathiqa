(function (global) {
  "use strict";

  const API = "/service-files";
  const params = new URLSearchParams(global.location.search);
  const serviceId = params.get("id");

  function show(message, success = true) {
    if (typeof global.showToast === "function") {
      global.showToast(message, success);
      return;
    }
    if (global.Toastify) {
      global.Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "center",
        style: { background: success ? "#16a34a" : "#dc2626" },
      }).showToast();
    }
  }

  function formatSize(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ar-EG");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isDeleteAllowed() {
    const currentRole = global.auth?.getCurrentRole?.();
    return currentRole === "admin" || currentRole === "lawyer";
  }

  async function loadFiles() {
    const container = document.getElementById("filesContainer");
    if (!container || !serviceId) return;

    container.innerHTML = `<p class="text-gray-500">جاري تحميل الملفات...</p>`;

    try {
      const files = await global.api.get(`${API}/service/${encodeURIComponent(serviceId)}`);
      renderFiles(Array.isArray(files) ? files : []);
    } catch (error) {
      console.error(error);
      container.innerHTML = `<div class="border border-red-200 bg-red-50 text-red-700 rounded-lg p-4">فشل تحميل ملفات الخدمة.</div>`;
    }
  }

  function renderFiles(files) {
    const container = document.getElementById("filesContainer");
    if (!container) return;

    if (!files.length) {
      container.innerHTML = `<div class="border border-dashed rounded-lg p-8 text-center text-gray-500">لا توجد ملفات مرفقة بهذه الخدمة.</div>`;
      return;
    }

    container.innerHTML = files.map((file) => `
      <div class="border rounded-xl p-4 bg-gray-50 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="min-w-0">
          <p class="font-semibold break-all">${escapeHtml(file.original_name)}</p>
          <div class="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>${escapeHtml(file.mime_type || "غير معروف")}</span>
            <span>${formatSize(file.file_size)}</span>
            <span>${escapeHtml(formatDate(file.uploaded_at))}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0 no-print">
          <button type="button" data-file-action="open" data-file-id="${file.file_id}" class="px-3 py-2 rounded bg-accent text-white">فتح</button>
          <button type="button" data-file-action="download" data-file-id="${file.file_id}" class="px-3 py-2 rounded bg-gray-700 text-white">تنزيل</button>
          ${isDeleteAllowed() ? `<button type="button" data-file-action="delete" data-file-id="${file.file_id}" class="px-3 py-2 rounded bg-red-600 text-white">حذف</button>` : ""}
        </div>
      </div>
    `).join("");
  }

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || !serviceId) return;

    const formData = new FormData();
    formData.append("service_id", serviceId);
    files.forEach((file) => formData.append("files", file));

    try {
      const result = await global.api.upload(`${API}/upload`, formData);
      show(result?.message || "تم رفع الملفات بنجاح", true);
      await loadFiles();
    } catch (error) {
      console.error(error);
      show(error?.message || "فشل رفع الملفات", false);
    }
  }

  async function openFile(fileId) {
    try {
      const blob = await global.api.download(`${API}/${fileId}/open`);
      const url = URL.createObjectURL(blob);
      global.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error(error);
      show(error?.message || "فشل فتح الملف", false);
    }
  }

  async function downloadFile(fileId) {
    try {
      const blob = await global.api.download(`${API}/${fileId}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "service-file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(error);
      show(error?.message || "فشل تنزيل الملف", false);
    }
  }

  async function deleteFile(fileId) {
    if (!isDeleteAllowed()) {
      show("ليس لديك صلاحية لحذف ملفات الخدمات", false);
      return;
    }

    const result = await global.Swal.fire({
      title: "حذف الملف؟",
      text: "لا يمكن التراجع بعد الحذف",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "نعم، حذف",
      cancelButtonText: "إلغاء",
    });
    if (!result.isConfirmed) return;

    try {
      await global.api.delete(`${API}/${fileId}`);
      show("تم حذف الملف بنجاح", true);
      await loadFiles();
    } catch (error) {
      console.error(error);
      show(error?.message || "فشل حذف الملف", false);
    }
  }

  function bind() {
    const input = document.getElementById("serviceFileInput");
    const uploadButton = document.getElementById("serviceFileUploadBtn");
    const container = document.getElementById("filesContainer");

    if (!input || !container || !serviceId) return;

    input.multiple = true;
    input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";

    uploadButton?.addEventListener("click", () => input.click());
    input.addEventListener("change", async (event) => {
      await uploadFiles(event.target.files);
      event.target.value = "";
    });

    container.addEventListener("click", (event) => {
      const button = event.target.closest("[data-file-action]");
      if (!button) return;

      const fileId = button.dataset.fileId;
      const action = button.dataset.fileAction;
      if (action === "open") openFile(fileId);
      if (action === "download") downloadFile(fileId);
      if (action === "delete") deleteFile(fileId);
    });

    loadFiles();
  }

  function start() {
    if (!global.location.pathname.endsWith("service-profile.html")) return;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
    else bind();
  }

  global.serviceFiles = Object.freeze({ loadFiles });
  start();
})(window);

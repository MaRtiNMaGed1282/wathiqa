(function (global) {
  "use strict";

  function downloadBlob(blob, filename) {
    if (!(blob instanceof Blob)) {
      throw new Error("ملف التصدير غير صالح");
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "export";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPdf(endpoint, filename = "wathiqa-report.pdf", options = {}) {
    if (!global.api) throw new Error("وحدة API غير متاحة");
    const blob = await global.api.download(endpoint, options);
    downloadBlob(blob, filename);
  }

  function exportExcel(rows, filename = "wathiqa-export.xlsx", sheetName = "بيانات") {
    if (!global.XLSX) {
      throw new Error("مكتبة Excel غير متاحة");
    }

    const safeRows = Array.isArray(rows) ? rows : [];
    const worksheet = global.XLSX.utils.json_to_sheet(safeRows);
    const workbook = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || "بيانات");
    global.XLSX.writeFile(workbook, filename);
  }

  global.exportUtils = Object.freeze({
    downloadBlob,
    downloadPdf,
    exportExcel,
  });
})(window);

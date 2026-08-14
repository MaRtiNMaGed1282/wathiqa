(function (global) {
  "use strict";

  const FINANCIAL_ROLES = new Set(["admin", "lawyer"]);

  function currentRole() {
    try {
      return global.auth?.getUser?.()?.role || null;
    } catch (_) {
      return null;
    }
  }

  function assertRole(financial) {
    if (financial && !FINANCIAL_ROLES.has(currentRole())) {
      throw new Error("ليس لديك صلاحية لتصدير البيانات المالية");
    }
  }

  function normalizeRows(rows, columns) {
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const output = {};
      columns.forEach((column) => {
        const value = row?.[column.key];
        output[column.header] = value == null ? "" : value;
      });
      return output;
    });
  }

  function numericValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;
    const normalized = value.replace(/,/g, "").replace(/٪/g, "").trim();
    if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }

  function dateValue(value) {
    if (typeof value !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?$/.test(value.trim())) return null;
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function coerceWorksheetValues(sheet, numericHeaders = [], dateHeaders = []) {
    const numeric = new Set(numericHeaders);
    const dates = new Set(dateHeaders);
    const range = sheet["!ref"];
    if (!range) return sheet;

    const rows = global.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const headers = rows[0] || [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
        const header = headers[columnIndex];
        const address = global.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const cell = sheet[address];
        if (!cell) continue;

        if (numeric.has(header)) {
          const number = numericValue(cell.v);
          if (number !== null) {
            cell.v = number;
            cell.t = "n";
          }
        } else if (dates.has(header)) {
          const date = dateValue(String(cell.v ?? ""));
          if (date) {
            cell.v = date;
            cell.t = "d";
            cell.z = "yyyy-mm-dd";
          }
        }
      }
    }

    return sheet;
  }

  function buildWorkbook(sheets) {
    if (!global.XLSX) throw new Error("مكتبة Excel غير متاحة");
    const workbook = global.XLSX.utils.book_new();

    sheets.forEach((definition) => {
      const rows = Array.isArray(definition.rows) ? definition.rows : [];
      const worksheet = global.XLSX.utils.json_to_sheet(rows, { skipHeader: false });
      coerceWorksheetValues(
        worksheet,
        definition.numericHeaders || [],
        definition.dateHeaders || [],
      );
      global.XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        String(definition.name || "Report").slice(0, 31),
      );
    });

    return workbook;
  }

  function exportWorkbook(options = {}) {
    assertRole(Boolean(options.financial));
    const workbook = buildWorkbook(options.sheets || []);
    const filename = String(options.filename || "wathiqa-report").replace(/[\\/:*?"<>|]+/g, "-");
    global.XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  function exportTable(tableOrId, options = {}) {
    assertRole(Boolean(options.financial));
    if (!global.XLSX) throw new Error("مكتبة Excel غير متاحة");

    const table = typeof tableOrId === "string" ? document.getElementById(tableOrId) : tableOrId;
    if (!table) throw new Error("جدول التصدير غير موجود");

    const worksheet = global.XLSX.utils.table_to_sheet(table, { raw: false });
    coerceWorksheetValues(worksheet, options.numericHeaders || [], options.dateHeaders || []);
    const workbook = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(workbook, worksheet, String(options.sheetName || "Report").slice(0, 31));
    global.XLSX.writeFile(workbook, `${String(options.filename || "wathiqa-report").replace(/[\\/:*?"<>|]+/g, "-")}.xlsx`);
  }

  global.WathiqaExcel = Object.freeze({
    exportWorkbook,
    exportTable,
    buildWorkbook,
    normalizeRows,
    assertRole,
  });
})(window);

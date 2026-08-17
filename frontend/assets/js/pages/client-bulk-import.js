"use strict";

(function () {
  const HEADERS = [
    ["الاسم الكامل", "full_name"],
    ["كود الموكل", "client_code"],
    ["الرقم القومي", "national_id"],
    ["رقم الهاتف", "phone"],
    ["العنوان", "address"],
    ["الملاحظات", "notes"],
  ];
  const MAX_ROWS = 5000;

  function showMessage(message, icon = "info") {
    return Swal.fire({
      title: message,
      icon,
      confirmButtonText: "حسناً",
    });
  }

  function downloadTemplate() {
    const headers = HEADERS.map(([label]) => label);
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet["!cols"] = [
      { wch: 28 }, { wch: 18 }, { wch: 18 },
      { wch: 18 }, { wch: 30 }, { wch: 40 },
    ];
    const instructions = XLSX.utils.aoa_to_sheet([
      ["نموذج استيراد الموكلين"],
      ["الحقل المطلوب: الاسم الكامل فقط"],
      ["الحقول الاختيارية: كود الموكل، الرقم القومي، رقم الهاتف، العنوان، الملاحظات"],
      ["إذا تم إدخال الرقم القومي يجب أن يتكون من 14 رقماً"],
      ["إذا تم إدخال رقم الهاتف يجب أن يكون بصيغة صحيحة"],
      ["الحد الأقصى للاستيراد: 5000 صف"],
    ]);
    instructions["!cols"] = [{ wch: 100 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الموكلين");
    XLSX.utils.book_append_sheet(workbook, instructions, "تعليمات");
    XLSX.writeFile(workbook, "نموذج-استيراد-الموكلين.xlsx");
  }

  function normalize(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target.result, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!firstSheet) throw new Error("لا توجد ورقة بيانات");
          const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
          if (!matrix.length) throw new Error("الملف فارغ");

          const actualHeaders = matrix[0].map(normalize);
          const expectedHeaders = HEADERS.map(([label]) => label);
          if (actualHeaders.length !== expectedHeaders.length || expectedHeaders.some((h, i) => actualHeaders[i] !== h)) {
            throw new Error("أعمدة الملف غير مطابقة للنموذج. استخدم نموذج استيراد الموكلين.");
          }

          const rows = matrix.slice(1)
            .map((cells) => Object.fromEntries(HEADERS.map(([, key], i) => [key, normalize(cells[i])])))
            .filter((row) => Object.values(row).some(Boolean));

          if (!rows.length) throw new Error("لا توجد صفوف بيانات للاستيراد");
          if (rows.length > MAX_ROWS) throw new Error(`الحد الأقصى للاستيراد هو ${MAX_ROWS} صف`);

          const invalidRows = rows
            .map((row, index) => ({ row, index: index + 2 }))
            .filter(({ row }) => !row.full_name);
          if (invalidRows.length) {
            throw new Error(`الاسم الكامل مطلوب في الصفوف: ${invalidRows.map(({ index }) => index).join("، ")}`);
          }

          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
      reader.readAsArrayBuffer(file);
    });
  }

  function createModal() {
    const wrapper = document.createElement("div");
    wrapper.id = "bulkImportModal";
    wrapper.className = "hidden fixed inset-0 bg-black/50 items-center justify-center z-50";
    wrapper.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl p-7 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-2xl font-bold">استيراد الموكلين من Excel / CSV</h3>
          <button type="button" id="closeBulkImportModal" class="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-500 hover:text-red-600 text-xl">✕</button>
        </div>
        <div class="grid md:grid-cols-2 gap-4 mb-5">
          <div>
            <label class="block font-semibold mb-2">ملف الاستيراد</label>
            <input id="bulkImportFile" type="file" accept=".xlsx,.xls,.csv" class="w-full border rounded p-3" />
          </div>
          <div>
            <label class="block font-semibold mb-2">عند وجود رقم قومي مكرر</label>
            <select id="bulkDuplicateMode" class="w-full border rounded p-3">
              <option value="skip">تخطي المكرر</option>
              <option value="update">تحديث الموكل الموجود</option>
            </select>
          </div>
        </div>
        <div class="flex flex-wrap gap-3 mb-5">
          <button type="button" id="downloadClientImportTemplate" style="display:inline-flex;align-items:center;justify-content:center;background:#273247;color:#ffffff;border:0;cursor:pointer;font-family:inherit;font-weight:600;" class="px-4 py-2 rounded">تحميل نموذج الاستيراد</button>
          <button type="button" id="previewClientImport" style="display:inline-flex;align-items:center;justify-content:center;background:#273247;color:#ffffff;border:0;cursor:pointer;font-family:inherit;font-weight:600;" class="px-4 py-2 rounded">معاينة البيانات</button>
        </div>
        <div id="bulkImportSummary" class="hidden mb-4 rounded-lg bg-gray-50 p-4"></div>
        <div id="bulkImportErrors" class="hidden mb-4 rounded-lg bg-red-50 p-4 text-red-800"></div>
        <div id="bulkImportPreview" class="hidden overflow-auto border rounded"></div>
        <div class="flex justify-end gap-3 mt-5">
          <button type="button" id="downloadImportErrors" style="display:none;align-items:center;justify-content:center;background:#4b5563;color:#ffffff;border:0;cursor:pointer;font-family:inherit;font-weight:600;" class="px-4 py-2 rounded">تحميل تقرير الأخطاء</button>
          <button type="button" id="confirmClientImport" style="display:none;align-items:center;justify-content:center;background:#16a34a;color:#ffffff;border:0;cursor:pointer;font-family:inherit;font-weight:600;" class="px-5 py-2 rounded">تأكيد الاستيراد</button>
        </div>
      </div>`;
    document.body.appendChild(wrapper);
    return wrapper;
  }

  function renderPreview(container, rows) {
    const table = document.createElement("table");
    table.className = "min-w-full text-right text-sm";
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr class="bg-secondary text-white">${HEADERS.map(([label]) => `<th class="p-3">${label}</th>`).join("")}</tr>`;
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    rows.slice(0, 100).forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-b";
      HEADERS.forEach(([, key]) => {
        const td = document.createElement("td");
        td.className = "p-3";
        td.textContent = row[key] || "—";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.replaceChildren(table);
    if (rows.length > 100) {
      const note = document.createElement("div");
      note.className = "p-3 text-sm text-gray-500";
      note.textContent = `تم عرض أول 100 صف فقط من أصل ${rows.length}.`;
      container.appendChild(note);
    }
    container.classList.remove("hidden");
  }

  function downloadErrors(errors) {
    const rows = [["رقم الصف", "سبب الخطأ"], ...errors.map((e) => [e.row, e.message])];
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الأخطاء");
    XLSX.writeFile(workbook, "تقرير-أخطاء-استيراد-الموكلين.xlsx");
  }

  function init() {
    const addButton = document.getElementById("openAddClientButton");
    if (!addButton || typeof XLSX === "undefined" || typeof api === "undefined") return;

    const bulkButton = document.createElement("button");
    bulkButton.type = "button";
    bulkButton.id = "openBulkImportButton";
    bulkButton.className = "bg-secondary text-white px-5 py-3 rounded-lg mr-2";
    bulkButton.textContent = "استيراد الموكلين";
    addButton.parentElement.insertBefore(bulkButton, addButton);

    const modal = createModal();
    const fileInput = document.getElementById("bulkImportFile");
    const duplicateMode = document.getElementById("bulkDuplicateMode");
    const previewButton = document.getElementById("previewClientImport");
    const confirmButton = document.getElementById("confirmClientImport");
    const previewContainer = document.getElementById("bulkImportPreview");
    const summary = document.getElementById("bulkImportSummary");
    const errorsBox = document.getElementById("bulkImportErrors");
    const downloadErrorsButton = document.getElementById("downloadImportErrors");
    let parsedRows = [];
    let latestErrors = [];

    const close = () => modal.classList.add("hidden");
    bulkButton.addEventListener("click", () => modal.classList.remove("hidden"));
    document.getElementById("closeBulkImportModal").addEventListener("click", close);
    document.getElementById("downloadClientImportTemplate").addEventListener("click", downloadTemplate);

    previewButton.addEventListener("click", async () => {
      if (!fileInput.files[0]) return showMessage("اختر ملف الاستيراد أولاً", "warning");
      try {
        parsedRows = await parseFile(fileInput.files[0]);
        renderPreview(previewContainer, parsedRows);
        summary.className = "mb-4 rounded-lg bg-blue-50 p-4";
        summary.textContent = `إجمالي الصفوف: ${parsedRows.length}. الاسم الكامل هو الحقل الإلزامي الوحيد.`;
        errorsBox.classList.add("hidden");
        confirmButton.style.display = "inline-flex";
      } catch (error) {
        confirmButton.style.display = "none";
        await showMessage(error.message || "فشل قراءة الملف", "error");
      }
    });

    confirmButton.addEventListener("click", async () => {
      if (!parsedRows.length) return;
      const confirmation = await Swal.fire({
        title: "تأكيد الاستيراد",
        text: `سيتم معالجة ${parsedRows.length} صف. هل تريد المتابعة؟`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "استيراد",
        cancelButtonText: "إلغاء",
      });
      if (!confirmation.isConfirmed) return;

      confirmButton.disabled = true;
      try {
        const result = await api.post("/clients/import", {
          rows: parsedRows,
          duplicateMode: duplicateMode.value,
        });
        latestErrors = result.errors || [];
        summary.className = "mb-4 rounded-lg bg-green-50 p-4";
        summary.textContent = `إجمالي الصفوف: ${result.total} | تمت الإضافة: ${result.added} | تم التحديث: ${result.updated} | تم التخطي: ${result.skipped} | فشل: ${result.failed}`;
        if (latestErrors.length) {
          errorsBox.className = "mb-4 rounded-lg bg-red-50 p-4 text-red-800";
          errorsBox.textContent = `عدد الصفوف التي بها أخطاء: ${latestErrors.length}`;
          downloadErrorsButton.style.display = "inline-flex";
        } else {
          errorsBox.classList.add("hidden");
          downloadErrorsButton.style.display = "none";
        }
        confirmButton.style.display = "none";
        if (typeof window.Page?.initialize === "function") {
          window.Page.destroy?.();
          await window.Page.initialize();
        }
      } catch (error) {
        await showMessage(error?.message || "فشل تنفيذ الاستيراد الجماعي", "error");
      } finally {
        confirmButton.disabled = false;
      }
    });

    downloadErrorsButton.addEventListener("click", () => downloadErrors(latestErrors));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

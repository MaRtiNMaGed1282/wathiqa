const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const bidiFactory = require("bidi-js");

const bidi = bidiFactory();

let hbPromise = null;
let hbModule = null;
let cairoFontDataPromise = null;

const PROJECT_ROOT = path.resolve(__dirname, "../../../");
const FONT_PATH = path.join(PROJECT_ROOT, "frontend/assets/fonts/Cairo-Regular.ttf");
const BOLD_FONT_PATH = path.join(PROJECT_ROOT, "frontend/assets/fonts/Cairo-Bold.ttf");
const UPLOADS_ROOT = path.join(PROJECT_ROOT, "uploads");
const DEFAULT_LOGO = path.join(PROJECT_ROOT, "frontend/assets/logow.png");

function loadHarfBuzz() {
  if (!hbPromise) {
    hbPromise = import("harfbuzzjs").then((module) => {
      hbModule = module;
      return module;
    });
  }
  return hbPromise;
}

function readFontData() {
  if (!cairoFontDataPromise) {
    cairoFontDataPromise = Promise.resolve(fs.readFileSync(FONT_PATH));
  }
  return cairoFontDataPromise;
}

function readBoldFontData() {
  return Promise.resolve(fs.readFileSync(BOLD_FONT_PATH));
}

function containsArabic(text) {
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/u.test(text);
}

function escapeFileName(value) {
  return String(value || "document")
    .replace(/[\\/:*?"<>|\r\n]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "document";
}

function safeUploadPath(filename) {
  if (!filename || typeof filename !== "string") return null;
  const normalized = filename.replace(/\\/g, "/");
  if (path.basename(normalized) !== normalized || normalized.includes("..")) return null;
  const resolved = path.resolve(UPLOADS_ROOT, normalized);
  return resolved.startsWith(`${UPLOADS_ROOT}${path.sep}`) ? resolved : null;
}

async function createHarfBuzzFont(fontData) {
  const hb = await loadHarfBuzz();
  const blob = new hb.Blob(fontData);
  const face = new hb.Face(blob);
  const font = new hb.Font(face);
  return { hb, blob, face, font };
}

function destroyHarfBuzzFont(resource) {
  if (!resource) return;
  resource.font.destroy();
  resource.face.destroy();
  resource.blob.destroy();
}

function shapeRun(text, font, direction) {
  const buffer = new hbModule.Buffer();
  buffer.addText(text);
  buffer.setDirection(direction);
  buffer.guessSegmentProperties();
  // Direction is explicitly set after guessing so RTL/LTR is deterministic.
  buffer.setDirection(direction);
  hbModule.shape(font, buffer);
  const glyphs = buffer.getGlyphInfosAndPositions();
  buffer.destroy();
  return glyphs;
}

function visualRuns(text) {
  const levelsResult = bidi.getEmbeddingLevels(text, "rtl");
  const { levels } = levelsResult;
  const runs = [];
  let start = 0;

  for (let i = 1; i <= levels.length; i += 1) {
    if (i === levels.length || levels[i] !== levels[start]) {
      runs.push({ start, end: i - 1, level: levels[start] });
      start = i;
    }
  }

  if (!runs.length) return [{ text, direction: "rtl" }];

  const visualIndices = bidi.getReorderedIndices(text, levelsResult, 0, text.length - 1);
  const runByIndex = new Map();
  runs.forEach((run, index) => {
    for (let i = run.start; i <= run.end; i += 1) runByIndex.set(i, index);
  });

  const visualRunOrder = [];
  visualIndices.forEach((index) => {
    const runIndex = runByIndex.get(index);
    if (runIndex !== undefined && !visualRunOrder.includes(runIndex)) visualRunOrder.push(runIndex);
  });

  return visualRunOrder.map((runIndex) => {
    const run = runs[runIndex];
    return {
      text: text.slice(run.start, run.end + 1),
      direction: run.level % 2 ? "rtl" : "ltr",
    };
  });
}

async function measureRun(text, fontResource, size, direction) {
  const glyphs = shapeRun(text, fontResource.font, direction);
  const scale = size / fontResource.font.unitsPerEM;
  return glyphs.reduce((sum, glyph) => sum + glyph.xAdvance * scale, 0);
}

async function drawShapedText(doc, text, x, y, width, options = {}) {
  const value = String(text ?? "");
  if (!value) return { height: options.size || 12 };

  const size = options.size || 12;
  const lineGap = options.lineGap ?? 5;
  const lineHeight = size + lineGap;
  const color = options.color || "#111827";
  const align = options.align || "right";
  const fontData = options.bold ? await readBoldFontData() : await readFontData();
  const resource = await createHarfBuzzFont(fontData);

  try {
    const paragraphs = value.replace(/\r\n/g, "\n").split("\n");
    let currentY = y;

    for (const paragraph of paragraphs) {
      if (!paragraph) {
        currentY += lineHeight;
        continue;
      }

      const words = paragraph.split(/(\s+)/u);
      const lines = [];
      let line = "";
      let lineWidth = 0;

      for (const token of words) {
        const tokenWidth = await measureRun(token, resource, size, containsArabic(token) ? "rtl" : "ltr");
        if (line && !/^\s+$/u.test(token) && lineWidth + tokenWidth > width) {
          lines.push(line);
          line = token;
          lineWidth = tokenWidth;
        } else {
          line += token;
          lineWidth += tokenWidth;
        }
      }
      if (line) lines.push(line);

      for (const lineText of lines) {
        const runs = visualRuns(lineText);
        const runWidths = [];
        let totalWidth = 0;
        for (const run of runs) {
          const runWidth = await measureRun(run.text, resource, size, run.direction);
          runWidths.push(runWidth);
          totalWidth += runWidth;
        }

        let cursorX;
        if (align === "center") cursorX = x + Math.max(0, (width - totalWidth) / 2);
        else if (align === "left") cursorX = x;
        else cursorX = x + Math.max(0, width - totalWidth);

        doc.fillColor(color);
        for (let i = 0; i < runs.length; i += 1) {
          const run = runs[i];
          const glyphs = shapeRun(run.text, resource.font, run.direction);
          const scale = size / resource.font.unitsPerEM;

          for (const glyph of glyphs) {
            const glyphPath = resource.font.glyphToPath(glyph.codepoint);
            if (!glyphPath) continue;
            const gx = cursorX + glyph.xOffset * scale;
            const gy = currentY + size + glyph.yOffset * scale;

            doc.save();
            doc.translate(gx, gy);
            doc.scale(scale, -scale);
            doc.path(glyphPath).fill(color);
            doc.restore();

            cursorX += glyph.xAdvance * scale;
          }
        }
        currentY += lineHeight;
      }
    }

    return { height: currentY - y };
  } finally {
    destroyHarfBuzzFont(resource);
  }
}

function addHeader(doc, office, title) {
  const pageWidth = doc.page.width;
  const margin = 42;
  const logoPath = office?.logo_path ? safeUploadPath(office.logo_path) : null;
  const finalLogo = logoPath && fs.existsSync(logoPath) ? logoPath : DEFAULT_LOGO;

  if (finalLogo && fs.existsSync(finalLogo)) {
    doc.image(finalLogo, margin, 34, { fit: [72, 72], align: "left", valign: "center" });
  }

  doc.fontSize(10).fillColor("#6b7280").text(new Date().toLocaleString("ar-EG"), margin, 38, { width: pageWidth - margin * 2, align: "left" });

  doc.fontSize(20).fillColor("#111827").text(title || "Wathiqa", margin, 64, { width: pageWidth - margin * 2, align: "right" });
  if (office?.office_name) {
    doc.fontSize(11).fillColor("#4b5563").text(office.office_name, margin, 92, { width: pageWidth - margin * 2, align: "right" });
  }

  doc.moveTo(margin, 116).lineTo(pageWidth - margin, 116).strokeColor("#d1d5db").stroke();
  doc.y = 132;
}

function addFooter(doc, office) {
  const margin = 42;
  const y = doc.page.height - 58;
  doc.moveTo(margin, y).lineTo(doc.page.width - margin, y).strokeColor("#e5e7eb").stroke();
  if (office?.stamp_path) {
    const stamp = safeUploadPath(office.stamp_path);
    if (stamp && fs.existsSync(stamp)) doc.image(stamp, doc.page.width - margin - 70, y - 52, { fit: [70, 45] });
  }
  doc.fontSize(8).fillColor("#6b7280").text("Wathiqa", margin, y + 8, { width: doc.page.width - margin * 2, align: "center" });
}

function section(doc, title, y) {
  doc.fontSize(14).fillColor("#111827").text(title, 42, y, { width: doc.page.width - 84, align: "right" });
  return y + 26;
}

async function addKeyValueRows(doc, rows, startY) {
  let y = startY;
  for (const [label, value] of rows) {
    await drawShapedText(doc, `${label}: ${value ?? "—"}`, 42, y, doc.page.width - 84, { size: 10, align: "right" });
    y += 22;
    if (y > doc.page.height - 90) { doc.addPage(); y = 45; }
  }
  return y;
}

function getOffice(db) {
  return new Promise((resolve, reject) => db.get("SELECT * FROM office_settings LIMIT 1", [], (err, row) => err ? reject(err) : resolve(row || {})));
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || {})));
}

function assertFinancialRole(user) {
  if (!user || !["admin", "lawyer"].includes(user.role)) {
    const error = new Error("ليس لديك صلاحية لإنشاء مستند مالي");
    error.status = 403;
    throw error;
  }
}

async function buildPdf(title, renderer) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 42, bottom: 70, left: 42, right: 42 }, autoFirstPage: true });
  const chunks = [];
  const promise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  await renderer(doc);
  doc.end();
  return promise;
}

async function createClientPdf(db, clientId, user) {
  const office = await getOffice(db);
  const client = await get(db, "SELECT * FROM clients WHERE id = ?", [clientId]);
  if (!client.id) throw Object.assign(new Error("الموكل غير موجود"), { status: 404 });

  const [cases, services, activity] = await Promise.all([
    all(db, "SELECT court_case_number,case_title,case_type,case_status,court_name,court_chamber,total_fees,opened_at,closed_at FROM legal_cases WHERE client_id=? ORDER BY datetime(created_at) DESC", [clientId]),
    all(db, "SELECT service_number,service_title,service_type,service_status,total_fees,start_date,due_date,completed_date FROM legal_services WHERE client_id=? ORDER BY datetime(created_at) DESC", [clientId]),
    all(db, "SELECT module,action,description,created_at FROM activity_logs WHERE module='client' AND record_id=? ORDER BY datetime(created_at) DESC LIMIT 50", [clientId]),
  ]);

  return buildPdf(`بيانات الموكل — ${client.full_name}`, async (doc) => {
    addHeader(doc, office, "بيانات الموكل");
    let y = await addKeyValueRows(doc, [["الاسم", client.full_name], ["كود الموكل", client.client_code], ["الرقم القومي", client.national_id], ["الهاتف", client.phone], ["العنوان", client.address], ["ملاحظات", client.notes]], 145);
    y = section(doc, "القضايا", y + 8);
    for (const item of cases) {
      y = await addKeyValueRows(doc, [["رقم القضية", item.court_case_number], ["القضية", item.case_title], ["النوع", item.case_type], ["الحالة", item.case_status], ["المحكمة", item.court_name], ["الأتعاب", ["admin", "lawyer"].includes(user.role) ? item.total_fees : "—"]], y);
      y += 6;
    }
    y = section(doc, "الخدمات", y + 8);
    for (const item of services) {
      y = await addKeyValueRows(doc, [["رقم الخدمة", item.service_number], ["الخدمة", item.service_title], ["النوع", item.service_type], ["الحالة", item.service_status], ["الأتعاب", ["admin", "lawyer"].includes(user.role) ? item.total_fees : "—"]], y);
    }
    if (activity.length) {
      y = section(doc, "النشاط الأخير", y + 8);
      y = await addKeyValueRows(doc, activity.map((item) => [item.created_at, `${item.action} — ${item.description || ""}`]), y);
    }
    addFooter(doc, office);
  });
}

async function createCasePdf(db, caseId, user) {
  const office = await getOffice(db);
  const item = await get(db, `SELECT lc.*, c.full_name client_name FROM legal_cases lc LEFT JOIN clients c ON c.id=lc.client_id WHERE lc.case_id=?`, [caseId]);
  if (!item.case_id) throw Object.assign(new Error("القضية غير موجودة"), { status: 404 });
  const [hearings, files, payments, expenses] = await Promise.all([
    all(db, "SELECT hearing_date,hearing_time,hearing_type,hearing_result FROM hearings WHERE case_id=? ORDER BY date(hearing_date) DESC", [caseId]),
    all(db, "SELECT file_name,original_name,file_path FROM case_files WHERE case_id=? ORDER BY file_name", [caseId]),
    all(db, "SELECT amount,payment_date,payment_method FROM payments WHERE case_id=? ORDER BY date(payment_date) DESC", [caseId]),
    all(db, "SELECT amount,expense_date,expense_type,description FROM case_expenses WHERE case_id=? ORDER BY date(expense_date) DESC", [caseId]),
  ]);
  const financial = ["admin", "lawyer"].includes(user.role);

  return buildPdf(`ملف القضية — ${item.court_case_number}`, async (doc) => {
    addHeader(doc, office, "ملف القضية");
    let y = await addKeyValueRows(doc, [["رقم القضية", item.court_case_number], ["عنوان القضية", item.case_title], ["الموكل", item.client_name], ["النوع", item.case_type], ["الحالة", item.case_status], ["الأولوية", item.priority_level], ["المحكمة", item.court_name], ["الدائرة", item.court_chamber], ["الخصم", item.opponent_name], ["محامي الخصم", item.opponent_lawyer], ["الوصف", item.case_description], ["النتيجة النهائية", item.final_result]], 145);
    if (financial) y = await addKeyValueRows(doc, [["إجمالي الأتعاب", item.total_fees], ["إجمالي المدفوع", payments.reduce((s, p) => s + Number(p.amount || 0), 0)], ["إجمالي المصروفات", expenses.reduce((s, e) => s + Number(e.amount || 0), 0)]], y + 6);
    y = section(doc, "الجلسات", y + 8);
    y = await addKeyValueRows(doc, hearings.map((h) => [h.hearing_date, `${h.hearing_time || ""} — ${h.hearing_type || ""} — ${h.hearing_result || ""}`]), y);
    y = section(doc, "الملفات", y + 8);
    y = await addKeyValueRows(doc, files.map((f) => ["الملف", f.original_name || f.file_name]), y);
    addFooter(doc, office);
  });
}

async function createServicePdf(db, serviceId, user) {
  const office = await getOffice(db);
  const item = await get(db, `SELECT ls.*, c.full_name client_name FROM legal_services ls LEFT JOIN clients c ON c.id=ls.client_id WHERE ls.service_id=?`, [serviceId]);
  if (!item.service_id) throw Object.assign(new Error("الخدمة غير موجودة"), { status: 404 });
  const [payments, expenses] = await Promise.all([
    all(db, "SELECT amount,payment_date,payment_method FROM payments WHERE service_id=? ORDER BY date(payment_date) DESC", [serviceId]),
    all(db, "SELECT amount,expense_date,expense_type,description FROM service_expenses WHERE service_id=? ORDER BY date(expense_date) DESC", [serviceId]),
  ]);
  const financial = ["admin", "lawyer"].includes(user.role);

  return buildPdf(`ملف الخدمة — ${item.service_number}`, async (doc) => {
    addHeader(doc, office, "ملف الخدمة");
    let y = await addKeyValueRows(doc, [["رقم الخدمة", item.service_number], ["الخدمة", item.service_title], ["النوع", item.service_type], ["الموكل", item.client_name], ["الوصف", item.description], ["الحالة", item.service_status], ["الأولوية", item.priority_level], ["تاريخ البداية", item.start_date], ["تاريخ الاستحقاق", item.due_date], ["تاريخ الإتمام", item.completed_date], ["المسؤول", item.assigned_to], ["ملاحظات", item.notes]], 145);
    if (financial) y = await addKeyValueRows(doc, [["إجمالي الأتعاب", item.total_fees], ["إجمالي المدفوع", payments.reduce((s, p) => s + Number(p.amount || 0), 0)], ["إجمالي المصروفات", expenses.reduce((s, e) => s + Number(e.amount || 0), 0)]], y + 6);
    y = section(doc, "المدفوعات", y + 8);
    if (financial) y = await addKeyValueRows(doc, payments.map((p) => [p.payment_date, `${p.amount} — ${p.payment_method || ""}`]), y);
    y = section(doc, "المصروفات", y + 8);
    if (financial) y = await addKeyValueRows(doc, expenses.map((e) => [e.expense_date, `${e.amount} — ${e.expense_type || ""} — ${e.description || ""}`]), y);
    addFooter(doc, office);
  });
}

async function createFinancialPdf(db, query = {}) {
  const office = await getOffice(db);
  const filter = String(query.filter || "all");
  let range = null;
  const now = new Date();
  if (filter === "today") { const d = now.toISOString().slice(0, 10); range = [d, d]; }
  if (filter === "month") { range = [new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)]; }
  if (filter === "year") { range = [new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10)]; }
  if (filter === "custom") range = [query.startDate, query.endDate];
  const dateClause = (column) => range ? ` WHERE date(${column}) BETWEEN ? AND ?` : "";
  const dateParams = range || [];
  const summary = await get(db, `SELECT
    (SELECT COALESCE(SUM(total_fees),0) FROM legal_cases${range ? " WHERE date(created_at) BETWEEN ? AND ?" : ""}) case_fees,
    (SELECT COALESCE(SUM(total_fees),0) FROM legal_services${range ? " WHERE date(created_at) BETWEEN ? AND ?" : ""}) service_fees,
    (SELECT COALESCE(SUM(amount),0) FROM payments${range ? " WHERE date(payment_date) BETWEEN ? AND ?" : ""}) paid,
    (SELECT COALESCE(SUM(amount),0) FROM case_expenses${range ? " WHERE date(expense_date) BETWEEN ? AND ?" : ""}) case_expenses,
    (SELECT COALESCE(SUM(amount),0) FROM service_expenses${range ? " WHERE date(expense_date) BETWEEN ? AND ?" : ""}) service_expenses`, range ? [...dateParams, ...dateParams, ...dateParams, ...dateParams, ...dateParams] : []);
  const caseFees = Number(summary.case_fees || 0), serviceFees = Number(summary.service_fees || 0), paid = Number(summary.paid || 0), expenses = Number(summary.case_expenses || 0) + Number(summary.service_expenses || 0);
  const totalFees = caseFees + serviceFees;

  return buildPdf("التقرير المالي", async (doc) => {
    addHeader(doc, office, "التقرير المالي");
    await addKeyValueRows(doc, [["الفترة", range ? `${range[0]} — ${range[1]}` : "كل الفترات"], ["أتعاب القضايا", caseFees], ["أتعاب الخدمات", serviceFees], ["إجمالي الأتعاب", totalFees], ["المحصل", paid], ["المتبقي", totalFees - paid], ["المصروفات", expenses], ["صافي الربح", paid - expenses], ["نسبة التحصيل", totalFees ? `${((paid / totalFees) * 100).toFixed(1)}%` : "0%"]], 145);
    addFooter(doc, office);
  });
}

async function createReportsPdf(db, query = {}) {
  const office = await getOffice(db);
  const counts = await get(db, `SELECT (SELECT COUNT(*) FROM clients) total_clients,(SELECT COUNT(*) FROM legal_cases) total_cases,(SELECT COUNT(*) FROM legal_services) total_services,(SELECT COUNT(*) FROM hearings) total_hearings,(SELECT COUNT(*) FROM activity_logs) total_activity`);
  const statuses = await all(db, "SELECT COALESCE(case_status,'غير محدد') status,COUNT(*) count FROM legal_cases GROUP BY case_status ORDER BY count DESC");
  const serviceStatuses = await all(db, "SELECT COALESCE(service_status,'غير محدد') status,COUNT(*) count FROM legal_services GROUP BY service_status ORDER BY count DESC");

  return buildPdf("التقارير", async (doc) => {
    addHeader(doc, office, "التقارير");
    let y = await addKeyValueRows(doc, [["إجمالي الموكلين", counts.total_clients], ["إجمالي القضايا", counts.total_cases], ["إجمالي الخدمات", counts.total_services], ["إجمالي الجلسات", counts.total_hearings], ["إجمالي النشاط", counts.total_activity]], 145);
    y = section(doc, "حالات القضايا", y + 8);
    y = await addKeyValueRows(doc, statuses.map((s) => [s.status, s.count]), y);
    y = section(doc, "حالات الخدمات", y + 8);
    y = await addKeyValueRows(doc, serviceStatuses.map((s) => [s.status, s.count]), y);
    addFooter(doc, office);
  });
}

module.exports = {
  assertFinancialRole,
  createClientPdf,
  createCasePdf,
  createServicePdf,
  createFinancialPdf,
  createReportsPdf,
};

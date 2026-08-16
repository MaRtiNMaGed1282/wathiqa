const fs = require("fs");
const path = require("path");
const db = require("../config/sqlite");
const { getLawsRoot } = require("../utils/storagePaths");

const LAWS_ROOT = getLawsRoot();

const LAW_METADATA = {
  "child-law.pdf": { title: "قانون الطفل", category: "قوانين الأسرة والطفل" },
  "civil-law.pdf": { title: "القانون المدني", category: "القانون المدني" },
  "civil-procedure-law.pdf": { title: "قانون المرافعات المدنية والتجارية", category: "المرافعات" },
  "commercial-law.pdf": { title: "قانون التجارة", category: "القانون التجاري" },
  "companies-law.pdf": { title: "قانون الشركات", category: "الشركات" },
  "constitution-2019.pdf": { title: "دستور جمهورية مصر العربية 2019", category: "الدستور" },
  "consumer-protection-law.pdf": { title: "قانون حماية المستهلك", category: "حماية المستهلك" },
  "criminal-law.pdf": { title: "قانون العقوبات", category: "القانون الجنائي" },
  "criminal-procedure-law.pdf": { title: "قانون الإجراءات الجنائية", category: "الإجراءات الجنائية" },
  "cybercrime-law.pdf": { title: "قانون مكافحة جرائم تقنية المعلومات", category: "الجرائم الإلكترونية" },
  "evidence-law.pdf": { title: "قانون الإثبات", category: "الإثبات" },
  "income-tax-law.pdf": { title: "قانون الضريبة على الدخل", category: "الضرائب" },
  "investment-law.pdf": { title: "قانون الاستثمار", category: "الاستثمار" },
};

function safeLawFilePath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;

  const normalized = relativePath.replace(/\\/g, "/");
  const filename = path.basename(normalized);

  if (!filename || normalized !== filename || filename.includes("..")) {
    return null;
  }

  const resolved = path.resolve(LAWS_ROOT, filename);
  if (!resolved.startsWith(`${LAWS_ROOT}${path.sep}`)) return null;
  return resolved;
}

function fallbackMetadata(filename) {
  const stem = path.basename(filename, ".pdf").replace(/[-_]+/g, " ").trim();
  const title = stem ? stem.replace(/\b\w/g, (letter) => letter.toUpperCase()) : filename;
  return { title, category: "تشريعات" };
}

function getExistingLawPaths() {
  return new Promise((resolve, reject) => {
    db.all("SELECT pdf_path FROM laws", [], (error, rows) => {
      if (error) return reject(error);
      resolve(new Set((rows || []).map((row) => String(row.pdf_path || "").trim()).filter(Boolean)));
    });
  });
}

async function ensureLawIndex() {
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS laws (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT,
        pdf_path TEXT NOT NULL
      )`,
      (error) => (error ? reject(error) : resolve()),
    );
  });

  const entries = await new Promise((resolve, reject) => {
    fs.readdir(LAWS_ROOT, { withFileTypes: true }, (error, result) => {
      if (error) {
        if (error.code === "ENOENT") return resolve([]);
        return reject(error);
      }
      resolve(result || []);
    });
  });

  const pdfs = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name);

  if (!pdfs.length) return;

  const existing = await getExistingLawPaths();
  const missing = pdfs.filter((filename) => !existing.has(filename));
  if (!missing.length) return;

  await new Promise((resolve, reject) => {
    db.serialize(() => {
      const insert = db.prepare("INSERT INTO laws (title, category, pdf_path) VALUES (?, ?, ?)");
      missing.forEach((filename) => {
        const metadata = LAW_METADATA[filename] || fallbackMetadata(filename);
        insert.run(metadata.title, metadata.category, filename);
      });
      insert.finalize((error) => (error ? reject(error) : resolve()));
    });
  });
}

exports.getAllLaws = async (req, res) => {
  try {
    await ensureLawIndex();
  } catch (error) {
    console.error("Unable to repair law index:", error.message || error);
  }

  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("(title LIKE ? OR category LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  db.all(
    `SELECT id, title, category, pdf_path FROM laws ${where} ORDER BY title COLLATE NOCASE ASC`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows || []);
    },
  );
};

exports.getLawById = async (req, res) => {
  try {
    await ensureLawIndex();
  } catch (error) {
    console.error("Unable to repair law index:", error.message || error);
  }

  const { id } = req.params;

  db.get(
    `SELECT id, title, category, pdf_path FROM laws WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row) return res.status(404).json({ message: "القانون غير موجود" });
      res.json(row);
    },
  );
};

exports.getLawFile = async (req, res) => {
  try {
    await ensureLawIndex();
  } catch (error) {
    console.error("Unable to repair law index:", error.message || error);
  }

  const { id } = req.params;
  const disposition = req.query.download === "1" ? "attachment" : "inline";

  db.get(
    `SELECT id, title, pdf_path FROM laws WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row) return res.status(404).json({ message: "القانون غير موجود" });

      const filePath = safeLawFilePath(row.pdf_path);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: "ملف القانون غير موجود" });
      }

      const filename = path.basename(filePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
      res.sendFile(filePath);
    },
  );
};

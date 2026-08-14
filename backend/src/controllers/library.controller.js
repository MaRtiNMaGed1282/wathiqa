const fs = require("fs");
const path = require("path");
const db = require("../config/sqlite");

const LAWS_ROOT = path.resolve(__dirname, "../../database/laws");

function safeLawFilePath(relativePath) {
  if (!relativePath || typeof relativePath !== "string") return null;

  const filename = path.basename(relativePath);
  if (!filename || filename !== relativePath && relativePath.includes("/")) {
    return null;
  }

  const resolved = path.resolve(LAWS_ROOT, filename);
  if (!resolved.startsWith(`${LAWS_ROOT}${path.sep}`)) return null;
  return resolved;
}

exports.getAllLaws = (req, res) => {
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
    `
      SELECT id, title, category, pdf_path
      FROM laws
      ${where}
      ORDER BY title COLLATE NOCASE ASC
    `,
    params,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(rows || []);
    },
  );
};

exports.getLawById = (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT id, title, category, pdf_path FROM laws WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (!row) {
        return res.status(404).json({ message: "القانون غير موجود" });
      }

      res.json(row);
    },
  );
};

exports.getLawFile = (req, res) => {
  const { id } = req.params;
  const disposition = req.query.download === "1" ? "attachment" : "inline";

  db.get(
    `SELECT id, title, pdf_path FROM laws WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (!row) {
        return res.status(404).json({ message: "القانون غير موجود" });
      }

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

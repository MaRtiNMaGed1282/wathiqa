const db = require("../config/sqlite");
const fs = require("fs");
const path = require("path");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty } = require("../utils/validation");

function resolveUploadPath(filePath, fileName) {
  const safeName = path.basename(fileName || "");
  const candidates = [
    filePath ? path.resolve(process.cwd(), filePath) : null,
    path.join(process.cwd(), "..", "uploads", safeName),
    path.join(__dirname, "../../uploads", safeName),
    path.join(__dirname, "../../../uploads", safeName),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

exports.uploadFile = (req, res) => {
  const { case_id } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (isEmpty(case_id)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.get("SELECT case_id FROM legal_cases WHERE case_id = ?", [case_id], (caseErr, caseRow) => {
    if (caseErr) {
      return res.status(500).json({ message: caseErr.message });
    }

    if (!caseRow) {
      return res.status(404).json({ message: "Case not found" });
    }

    const originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
    const relativePath = `uploads/${path.basename(req.file.filename)}`;

    db.run(
      `
      INSERT INTO case_files (
        case_id,
        file_name,
        original_name,
        file_path
      )
      VALUES (?, ?, ?, ?)
      `,
      [case_id, path.basename(req.file.filename), originalName, relativePath],
      function (err) {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        logActivity({
          module: "file",
          record_id: this.lastID,
          action: "uploaded",
          description: `تم رفع الملف: ${originalName}`,
          user_id: req.user.id,
        });

        createNotification({
          title: "File uploaded",
          message: `A file was uploaded: ${originalName}`,
          type: "info",
          module: "file",
          record_id: this.lastID,
          user_id: req.user.id,
        }).catch((err) => {
          console.error("Notification error:", err.message);
        });

        res.status(201).json({
          message: "تم رفع الملف بنجاح",
          file_id: this.lastID,
        });
      },
    );
  });
};

exports.getFilesByCase = (req, res) => {
  const { caseId } = req.params;

  db.all(
    `
    SELECT
      file_id,
      case_id,
      file_name,
      original_name,
      file_path,
      uploaded_at
    FROM case_files
    WHERE case_id = ?
    ORDER BY uploaded_at DESC
    `,
    [caseId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(rows);
    },
  );
};

exports.deleteFile = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      file_id,
      file_name,
      file_path,
      original_name
    FROM case_files
    WHERE file_id = ?
    `,
    [id],
    (err, file) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (!file) {
        return res.status(404).json({ message: "الملف غير موجود" });
      }

      const physicalPath = resolveUploadPath(file.file_path, file.file_name);
      if (physicalPath && fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch (unlinkError) {
          return res.status(500).json({
            message: "تعذر حذف الملف من التخزين",
            error: unlinkError.message,
          });
        }
      }

      db.run(
        `DELETE FROM case_files WHERE file_id = ?`,
        [id],
        function (deleteErr) {
          if (deleteErr) {
            return res.status(500).json({ message: deleteErr.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: "الملف غير موجود" });
          }

          logActivity({
            module: "file",
            record_id: Number(id),
            action: "deleted",
            description: `تم حذف الملف: ${file.original_name}`,
            user_id: req.user.id,
          });

          res.json({ message: "تم حذف الملف" });
        },
      );
    },
  );
};

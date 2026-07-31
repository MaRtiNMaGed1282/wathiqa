const db = require("../config/sqlite");
const fs = require("fs");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty } = require("../utils/validation");

/**
 * Upload File
 */
exports.uploadFile = (req, res) => {
  const { case_id } = req.body;

  if (!req.file) {
    return res.status(400).json({
      message: "File is required",
    });
  }

  if (isEmpty(case_id)) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  const originalName = Buffer.from(req.file.originalname, "latin1").toString(
    "utf8",
  );

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
    [case_id, req.file.filename, originalName, `uploads/${req.file.filename}`],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
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

      res.json({
        message: "تم رفع الملف بنجاح",
        file_id: this.lastID,
      });
    },
  );
};

exports.getFilesByCase = (req, res) => {
  const { caseId } = req.params;

  db.all(
    `
    SELECT *
    FROM case_files
    WHERE case_id = ?
    ORDER BY uploaded_at DESC
    `,
    [caseId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
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
    file_path,
    original_name
  FROM case_files
  WHERE file_id = ?
  `,
    [id],
    (err, file) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!file) {
        return res.status(404).json({
          message: "الملف غير موجود",
        });
      }

      if (file.file_path && fs.existsSync(file.file_path)) {
        try {
          fs.unlinkSync(file.file_path);
        } catch (e) {
          console.error(e);
        }
      }

      db.run(
        `
        DELETE FROM case_files
        WHERE file_id = ?
        `,
        [id],
        function (err) {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              message: "الملف غير موجود",
            });
          }

          logActivity({
            module: "file",
            record_id: Number(id),
            action: "deleted",
            description: `تم حذف الملف: ${file.original_name}`,
            user_id: req.user.id,
          });

          res.json({
            message: "تم حذف الملف",
          });
        },
      );
    },
  );
};

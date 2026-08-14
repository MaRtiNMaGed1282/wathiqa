const db = require("../config/sqlite");
const path = require("path");
const fs = require("fs");
const logActivity = require("../utils/activityLogger");
const attorneyUpload = require("../config/attorneyUpload");

function getAttorneyFilePath(filePath) {
  if (!filePath) return null;

  const filename = path.basename(String(filePath));
  if (!filename || filename === "." || filename === "..") return null;

  const uploadDir = path.resolve(attorneyUpload.getUploadDir());
  const absolutePath = path.resolve(uploadDir, filename);

  if (
    absolutePath !== uploadDir &&
    !absolutePath.startsWith(`${uploadDir}${path.sep}`)
  ) {
    return null;
  }

  return absolutePath;
}

function removeAttorneyFile(filePath) {
  const absolutePath = getAttorneyFilePath(filePath);
  if (!absolutePath || !fs.existsSync(absolutePath)) return;

  try {
    fs.unlinkSync(absolutePath);
  } catch (error) {
    console.error("Attorney file deletion error:", error.message);
  }
}

exports.createAttorney = (req, res) => {
  const client_id = req.body.client_id;
  const attorney_number = req.body.attorney_number;
  const attorney_type = req.body.attorney_type;
  const issue_date = req.body.issue_date;

  const issuing_office =
    req.body.issuing_office || req.body["issuing_office"] || "";

  const notes = req.body.notes;
  const storedFileName = req.file ? req.file.filename : null;

  db.run(
    `
    INSERT INTO client_attorneys (
      client_id,
      attorney_number,
      attorney_type,
      issue_date,
      issuing_office,
      file_path,
      notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      client_id,
      attorney_number,
      attorney_type,
      issue_date,
      issuing_office,
      storedFileName,
      notes,
    ],
    function (err) {
      if (err) {
        removeAttorneyFile(storedFileName);
        return res.status(500).json({
          message: err.message,
        });
      }

      const attorneyId = this.lastID;

      logActivity({
        module: "attorney",
        record_id: attorneyId,
        action: "created",
        description: "تم إضافة توكيل",
        user_id: req.user.id,
      });

      return res.status(201).json({
        message: "Attorney created successfully",
        id: attorneyId,
      });
    },
  );
};

exports.getClientAttorneys = (req, res) => {
  const { clientId } = req.params;

  db.all(
    `
    SELECT *
    FROM client_attorneys
    WHERE client_id = ?
    ORDER BY created_at DESC
    `,
    [clientId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      return res.json(rows);
    },
  );
};

exports.downloadAttorneyFile = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT file_path
    FROM client_attorneys
    WHERE id = ?
    `,
    [id],
    (err, attorney) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (!attorney || !attorney.file_path) {
        return res.status(404).json({ message: "ملف التوكيل غير موجود" });
      }

      const absolutePath = getAttorneyFilePath(attorney.file_path);

      if (!absolutePath || !fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "ملف التخزين غير موجود" });
      }

      return res.sendFile(absolutePath);
    },
  );
};

exports.deleteAttorney = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT file_path
    FROM client_attorneys
    WHERE id = ?
    `,
    [id],
    (selectErr, attorney) => {
      if (selectErr) {
        return res.status(500).json({ message: selectErr.message });
      }

      if (!attorney) {
        return res.status(404).json({ message: "Attorney not found" });
      }

      db.run(
        `
        DELETE FROM client_attorneys
        WHERE id = ?
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
              message: "Attorney not found",
            });
          }

          removeAttorneyFile(attorney.file_path);

          logActivity({
            module: "attorney",
            record_id: Number(id),
            action: "deleted",
            description: "تم حذف التوكيل",
            user_id: req.user.id,
          });

          return res.json({
            message: "Attorney deleted successfully",
          });
        },
      );
    },
  );
};

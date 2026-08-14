const db = require("../config/sqlite");
const fs = require("fs");
const path = require("path");
const logActivity = require("../utils/activityLogger");

function getUploadDir() {
  try {
    const { app } = require("electron");

    if (app && app.isPackaged) {
      return path.join(app.getPath("userData"), "uploads");
    }
  } catch (_) {
    // Running outside Electron.
  }

  return path.join(__dirname, "../../../uploads");
}

function resolveStoredFile(fileName) {
  const uploadDir = path.resolve(getUploadDir());
  const safeName = path.basename(fileName || "");
  const resolved = path.resolve(uploadDir, safeName);

  if (resolved !== uploadDir && !resolved.startsWith(uploadDir + path.sep)) {
    return null;
  }

  return resolved;
}

function serviceExists(serviceId, callback) {
  db.get(
    "SELECT service_id FROM legal_services WHERE service_id = ?",
    [serviceId],
    (err, row) => callback(err, Boolean(row)),
  );
}

exports.uploadServiceFiles = (req, res) => {
  const serviceId = Number(req.body.service_id);

  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    if (req.files) {
      req.files.forEach((file) => fs.rmSync(file.path, { force: true }));
    }
    return res.status(400).json({ message: "الخدمة غير صالحة" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "يجب اختيار ملف واحد على الأقل" });
  }

  serviceExists(serviceId, (err, exists) => {
    if (err) {
      req.files.forEach((file) => fs.rmSync(file.path, { force: true }));
      return res.status(500).json({ message: err.message });
    }

    if (!exists) {
      req.files.forEach((file) => fs.rmSync(file.path, { force: true }));
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    let completed = 0;
    let failed = false;
    const uploaded = [];

    req.files.forEach((file) => {
      const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");

      db.run(
        `
        INSERT INTO service_files (
          service_id,
          file_name,
          original_name,
          file_path,
          mime_type,
          file_size,
          uploaded_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          serviceId,
          file.filename,
          originalName,
          `uploads/${file.filename}`,
          file.mimetype,
          file.size,
          req.user.id,
        ],
        function (insertErr) {
          if (insertErr && !failed) {
            failed = true;
            req.files.forEach((item) => fs.rmSync(item.path, { force: true }));
            return res.status(500).json({ message: insertErr.message });
          }

          if (!insertErr) {
            uploaded.push({
              file_id: this.lastID,
              original_name: originalName,
              mime_type: file.mimetype,
              file_size: file.size,
            });

            logActivity({
              module: "service_file",
              record_id: this.lastID,
              action: "uploaded",
              description: `تم رفع ملف الخدمة: ${originalName}`,
              user_id: req.user.id,
            });
          }

          completed += 1;
          if (!failed && completed === req.files.length) {
            return res.status(201).json({
              message: "تم رفع الملفات بنجاح",
              files: uploaded,
            });
          }
        },
      );
    });
  });
};

exports.getServiceFiles = (req, res) => {
  const serviceId = Number(req.params.serviceId);

  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return res.status(400).json({ message: "الخدمة غير صالحة" });
  }

  db.all(
    `
    SELECT
      file_id,
      service_id,
      original_name,
      mime_type,
      file_size,
      uploaded_at,
      uploaded_by
    FROM service_files
    WHERE service_id = ?
    ORDER BY uploaded_at DESC, file_id DESC
    `,
    [serviceId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(rows);
    },
  );
};

function sendServiceFile(req, res, asDownload) {
  const fileId = Number(req.params.id);

  if (!Number.isInteger(fileId) || fileId <= 0) {
    return res.status(400).json({ message: "الملف غير صالح" });
  }

  db.get(
    `
    SELECT file_id, service_id, file_name, original_name, mime_type
    FROM service_files
    WHERE file_id = ?
    `,
    [fileId],
    (err, file) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!file) return res.status(404).json({ message: "الملف غير موجود" });

      const absolutePath = resolveStoredFile(file.file_name);
      if (!absolutePath || !fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "ملف التخزين غير موجود" });
      }

      if (asDownload) {
        return res.download(absolutePath, file.original_name);
      }

      res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
      return res.sendFile(absolutePath);
    },
  );
}

exports.openServiceFile = (req, res) => sendServiceFile(req, res, false);
exports.downloadServiceFile = (req, res) => sendServiceFile(req, res, true);

exports.deleteServiceFile = (req, res) => {
  if (!req.user || !["admin", "lawyer"].includes(req.user.role)) {
    return res.status(403).json({ message: "ليس لديك صلاحية لحذف ملفات الخدمات" });
  }

  const fileId = Number(req.params.id);

  if (!Number.isInteger(fileId) || fileId <= 0) {
    return res.status(400).json({ message: "الملف غير صالح" });
  }

  db.get(
    `
    SELECT file_id, file_name, original_name
    FROM service_files
    WHERE file_id = ?
    `,
    [fileId],
    (err, file) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!file) return res.status(404).json({ message: "الملف غير موجود" });

      const absolutePath = resolveStoredFile(file.file_name);

      db.run(
        "DELETE FROM service_files WHERE file_id = ?",
        [fileId],
        function (deleteErr) {
          if (deleteErr) return res.status(500).json({ message: deleteErr.message });

          if (this.changes === 0) {
            return res.status(404).json({ message: "الملف غير موجود" });
          }

          if (absolutePath) {
            fs.rmSync(absolutePath, { force: true });
          }

          logActivity({
            module: "service_file",
            record_id: fileId,
            action: "deleted",
            description: `تم حذف ملف الخدمة: ${file.original_name}`,
            user_id: req.user.id,
          });

          return res.json({ message: "تم حذف الملف بنجاح" });
        },
      );
    },
  );
};

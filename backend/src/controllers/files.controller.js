const db = require("../config/sqlite");
const fs = require("fs");
const path = require("path");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty } = require("../utils/validation");

function decodeOriginalName(name) {
  return Buffer.from(name, "latin1").toString("utf8");
}

function removeStoredFile(filePath) {
  if (!filePath) return;

  const absolutePath = path.resolve(__dirname, "../../", filePath);

  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (error) {
      console.error("File deletion error:", error.message);
    }
  }
}

/**
 * Upload case file
 */
exports.uploadFile = (req, res) => {
  const { case_id } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (isEmpty(case_id)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const originalName = decodeOriginalName(req.file.originalname);

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
      }).catch((error) => {
        console.error("Notification error:", error.message);
      });

      return res.json({
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
        return res.status(500).json({ message: err.message });
      }

      return res.json(rows);
    },
  );
};

exports.deleteFile = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT file_path, original_name
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

      removeStoredFile(file.file_path);

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

          return res.json({ message: "تم حذف الملف" });
        },
      );
    },
  );
};

/**
 * Upload service file
 */
exports.uploadServiceFile = (req, res) => {
  const { service_id } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (isEmpty(service_id)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const originalName = decodeOriginalName(req.file.originalname);

  db.get(
    `SELECT service_id FROM legal_services WHERE service_id = ?`,
    [service_id],
    (serviceErr, service) => {
      if (serviceErr) {
        return res.status(500).json({ message: serviceErr.message });
      }

      if (!service) {
        removeStoredFile(`uploads/${req.file.filename}`);
        return res.status(404).json({ message: "الخدمة غير موجودة" });
      }

      db.run(
        `
        INSERT INTO service_files (
          service_id,
          file_name,
          original_name,
          file_path
        )
        VALUES (?, ?, ?, ?)
        `,
        [service_id, req.file.filename, originalName, `uploads/${req.file.filename}`],
        function (err) {
          if (err) {
            removeStoredFile(`uploads/${req.file.filename}`);
            return res.status(500).json({ message: err.message });
          }

          logActivity({
            module: "service_file",
            record_id: this.lastID,
            action: "uploaded",
            description: `تم رفع ملف الخدمة: ${originalName}`,
            user_id: req.user.id,
          });

          createNotification({
            title: "Service file uploaded",
            message: `A service file was uploaded: ${originalName}`,
            type: "info",
            module: "service_file",
            record_id: this.lastID,
            user_id: req.user.id,
          }).catch((error) => {
            console.error("Notification error:", error.message);
          });

          return res.json({
            message: "تم رفع ملف الخدمة بنجاح",
            file_id: this.lastID,
          });
        },
      );
    },
  );
};

/**
 * List service files
 */
exports.getFilesByService = (req, res) => {
  const { serviceId } = req.params;

  db.all(
    `
    SELECT *
    FROM service_files
    WHERE service_id = ?
    ORDER BY uploaded_at DESC
    `,
    [serviceId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      return res.json(rows);
    },
  );
};

/**
 * Download/open a service file through the authenticated API.
 */
exports.downloadServiceFile = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT file_path, original_name
    FROM service_files
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

      const absolutePath = path.resolve(__dirname, "../../", file.file_path);

      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "ملف التخزين غير موجود" });
      }

      res.sendFile(absolutePath, {
        headers: {
          "Content-Disposition": `inline; filename="${encodeURIComponent(file.original_name)}"`,
        },
      });
    },
  );
};

/**
 * Delete service file. Role restriction is enforced at the route boundary.
 */
exports.deleteServiceFile = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT file_path, original_name
    FROM service_files
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

      removeStoredFile(file.file_path);

      db.run(
        `DELETE FROM service_files WHERE file_id = ?`,
        [id],
        function (deleteErr) {
          if (deleteErr) {
            return res.status(500).json({ message: deleteErr.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: "الملف غير موجود" });
          }

          logActivity({
            module: "service_file",
            record_id: Number(id),
            action: "deleted",
            description: `تم حذف ملف الخدمة: ${file.original_name}`,
            user_id: req.user.id,
          });

          return res.json({ message: "تم حذف ملف الخدمة" });
        },
      );
    },
  );
};

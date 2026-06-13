const db = require("../config/sqlite");

/**
 * Upload File
 */
exports.uploadFile = (req, res) => {
  const { case_id } = req.body;

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
    [case_id, req.file.filename, req.file.originalname, req.file.path],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({
        message: "File uploaded successfully",
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
          message: "File not found",
        });
      }

      res.json({
        message: "File deleted",
      });
    },
  );
};

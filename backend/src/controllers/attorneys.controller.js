const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");

exports.createAttorney = (req, res) => {
  console.log("BODY:", req.body);

  const client_id = req.body.client_id;
  const attorney_number = req.body.attorney_number;
  const attorney_type = req.body.attorney_type;
  const issue_date = req.body.issue_date;

  const issuing_office =
    req.body.issuing_office || req.body["issuing_office"] || "";

  const notes = req.body.notes;

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
      req.file ? req.file.filename : null,
      notes,
    ],
    function (err) {
      if (err) {
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

      res.status(201).json({
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

      res.json(rows);
    },
  );
};
exports.deleteAttorney = (req, res) => {
  const { id } = req.params;

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

      logActivity({
        module: "attorney",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف التوكيل",
        user_id: req.user.id,
      });

      res.json({
        message: "Attorney deleted successfully",
      });
    },
  );
};

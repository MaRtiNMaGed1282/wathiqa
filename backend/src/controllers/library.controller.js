const db = require("../config/sqlite");

exports.getAllLaws = (req, res) => {
  db.all(
    `
    SELECT *
    FROM laws
    ORDER BY title ASC
    `,
    [],
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

exports.getLawById = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT *
    FROM laws
    WHERE id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "Law not found",
        });
      }

      res.json(row);
    },
  );
};

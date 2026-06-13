const crypto = require("crypto");

const SECRET = "WATHIQA_MASTER_SECRET_2026";

exports.getLicenseInfo = (req, res) => {
  db.get(
    `
    SELECT payload
    FROM license
    LIMIT 1
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row || !row.payload) {
        return res.status(404).json({
          message: "No license",
        });
      }

      const payload = JSON.parse(row.payload);

      res.json(payload);
    },
  );
};

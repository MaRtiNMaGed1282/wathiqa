const db = require("../config/sqlite");

exports.getClientCases = (req, res) => {
  const { id } = req.params;

  db.all(
    `
      SELECT
        lc.case_id,
        lc.court_case_number,
        lc.case_title,
        lc.case_type,
        lc.court_name,
        lc.court_chamber,
        lc.case_status,
        lc.priority_level,
        lc.opened_at,
        lc.closed_at,
        lc.case_description,
        lc.final_result,
        lc.created_at,
        lc.updated_at
      FROM legal_cases lc
      WHERE lc.client_id = ?
      ORDER BY lc.created_at DESC, lc.case_id DESC
    `,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "فشل في جلب قضايا الموكل",
          error: err.message,
        });
      }

      res.json(rows || []);
    },
  );
};
